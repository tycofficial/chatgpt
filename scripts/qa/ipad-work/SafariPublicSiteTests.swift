import Foundation
import XCTest

final class SafariPublicSiteTests: XCTestCase {
    private let workNames = ["Work", "工作"]
    private let sendNames = ["send-button", "Send", "Send message", "发送", "发送消息"]
    private let editorNames = ["prompt-textarea", "使用 ChatGPT Work", "Use ChatGPT Work"]
    private let reloadNames = ["Reload", "Reload Page", "Reload This Page", "reloadButton", "重新载入", "重新載入", "重新加载", "重新整理", "刷新"]
    private let prompt = "Verify the saved Work conversation with a short acknowledgment."
    private let answer = "iPad Work recovery fixture response."

    private struct RequestMetrics: Decodable {
        let model: String
        let effort: String?
        let expectedPrompt: Bool
        let stream: Bool
    }

    private struct SavedThread: Decodable, Equatable {
        let id: String
        let title: String
        let model: String
        let effort: String
        let replyItems: Int
    }

    private struct FixtureMetrics: Decodable {
        let documentLoads: Int
        let documentLocations: [String]
        let clientLocation: String?
        let inferencePosts: Int
        let inferenceCalls: Int
        let inferenceRequestIds: [String]
        let request: RequestMetrics?
        let savedWorkThreads: [SavedThread]
        let visibleReplyCount: Int
    }

    @MainActor
    func testWorkTogglesAndBrowserChromeReload() async throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .landscapeLeft
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20), "Safari is not foregrounded")
        let web = safari.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 35), "Fixture web view did not start")

        let work = try waitForHittable(named(workNames, in: web.switches), seconds: 45)
        if !workIsEnabled(work) { work.tap() }
        let activateUntil = Date().addingTimeInterval(30)
        while !workIsEnabled(work) && Date() < activateUntil {
            try await Task.sleep(for: .milliseconds(250))
        }
        XCTAssertTrue(workIsEnabled(work), "Work switch did not activate")
        print("IPAD_QA native-work-mode-selected")

        let editor = try waitForHittable(named(editorNames, in: web.textViews), seconds: 25)
        editor.tap()
        safari.typeText(prompt)
        let send = try waitForHittable(named(sendNames, in: web.buttons), seconds: 15)
        XCTAssertTrue(send.isEnabled, "The Work composer did not enable Send")
        send.tap()
        print("IPAD_QA native-work-request-submitted")

        let replies = web.staticTexts.matching(NSPredicate(format: "label == %@ OR value == %@", answer, answer))
        XCTAssertTrue(replies.firstMatch.waitForExistence(timeout: 60), "The deterministic Work reply was not visible")
        print("IPAD_QA pre-reload matching accessibility nodes: \(replies.count)")
        let before = try await waitForMetrics { $0.visibleReplyCount > 0 && !$0.savedWorkThreads.isEmpty }
        let restoredThread = try XCTUnwrap(before.savedWorkThreads.first)
        XCTAssertEqual(before.savedWorkThreads.count, 1)
        XCTAssertEqual(before.visibleReplyCount, 1, "The rendered Work reply was duplicated before reload")
        XCTAssertEqual(restoredThread.replyItems, 1, "The saved Work reply was duplicated before reload")
        XCTAssertEqual(restoredThread.model, "gpt-6.2-sol")
        XCTAssertEqual(restoredThread.effort, "low")
        XCTAssertEqual(before.inferencePosts, 1)
        XCTAssertEqual(before.inferenceCalls, 1)
        XCTAssertEqual(before.request?.model, "gpt-6.2-sol")
        XCTAssertEqual(before.request?.effort, "low")
        XCTAssertEqual(before.request?.expectedPrompt, true)
        XCTAssertEqual(before.request?.stream, true)
        print("IPAD_QA work-model-effort-and-first-reply-verified")

        let hideKeyboard = named(["Hide keyboard", "Dismiss keyboard", "隐藏键盘", "关闭键盘"], in: safari.keyboards.buttons).firstMatch
        if hideKeyboard.exists && hideKeyboard.isHittable { hideKeyboard.tap() }
        let reload = try waitForHittable(named(reloadNames, in: safari.buttons), seconds: 18)
        reload.tap()
        print("IPAD_QA browser-toolbar-reload-tapped")

        _ = try await waitForMetrics { metrics in
            metrics.documentLoads > before.documentLoads && metrics.documentLocations.dropFirst(before.documentLoads).contains { location in
                location.split(separator: "?", maxSplits: 1).first?.hasSuffix("/c/" + restoredThread.id) == true
            }
        }
        if !replies.firstMatch.waitForExistence(timeout: 10) {
            // The Work composer can stay on the home URL after sending; reopen the exact saved title.
            let historyTitle = [restoredThread.title]
            let restored = try waitForHittable([
                named(historyTitle, in: web.buttons),
                named(historyTitle, in: web.links),
                named(historyTitle, in: web.staticTexts),
            ], seconds: 28)
            restored.tap()
            print("IPAD_QA reopened-the-saved-work-chat-from-history")
        }
        XCTAssertTrue(replies.firstMatch.waitForExistence(timeout: 55), "The original Work reply was not restored after Safari reload")
        print("IPAD_QA post-reload matching accessibility nodes: \(replies.count)")
        let prompts = web.staticTexts.matching(NSPredicate(format: "label == %@ OR value == %@", prompt, prompt))
        XCTAssertTrue(prompts.firstMatch.waitForExistence(timeout: 10), "The original Work prompt was not restored")
        let after = try await waitForMetrics { $0.visibleReplyCount > 0 }
        XCTAssertEqual(after.visibleReplyCount, 1, "The rendered Work reply was duplicated after reload")
        XCTAssertEqual(after.savedWorkThreads, [restoredThread], "The original saved Work ID, model and effort changed")
        XCTAssertEqual(after.inferenceRequestIds, before.inferenceRequestIds)
        XCTAssertEqual(after.inferencePosts, 1)
        XCTAssertEqual(after.inferenceCalls, 1)
        print("IPAD_QA same-work-conversation-restored-one-inference")
    }

    private func fixtureMetrics() async throws -> FixtureMetrics {
        let url = try XCTUnwrap(URL(string: "https://127.0.0.1:4400/__ipad_qa/metrics"))
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
        let (data, response) = try await URLSession.shared.data(for: request)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
        return try JSONDecoder().decode(FixtureMetrics.self, from: data)
    }

    private func waitForMetrics(_ matches: (FixtureMetrics) -> Bool) async throws -> FixtureMetrics {
        let expiry = Date().addingTimeInterval(25)
        repeat {
            let metrics = try await fixtureMetrics()
            if matches(metrics) { return metrics }
            try await Task.sleep(for: .milliseconds(300))
        } while Date() < expiry
        throw NSError(domain: "SafariQA", code: 2, userInfo: [NSLocalizedDescriptionKey: "Fixture did not record the expected Safari conversation lifecycle"])
    }

    private func workIsEnabled(_ element: XCUIElement) -> Bool {
        guard element.exists else { return false }
        let value = element.value.map { String(describing: $0) } ?? ""
        return ["1", "true", "on", "打开", "已打开"].contains(value.lowercased())
    }

    private func named(_ names: [String], in query: XCUIElementQuery) -> XCUIElementQuery {
        query.matching(NSPredicate(format: "identifier IN[c] %@ OR label IN[c] %@", names, names))
    }

    private func waitForHittable(_ query: XCUIElementQuery, seconds: TimeInterval) throws -> XCUIElement {
        try waitForHittable([query], seconds: seconds)
    }

    private func waitForHittable(_ queries: [XCUIElementQuery], seconds: TimeInterval) throws -> XCUIElement {
        let expiry = Date().addingTimeInterval(seconds)
        repeat {
            for query in queries {
                if let element = query.allElementsBoundByIndex.first(where: { $0.exists && $0.isHittable }) {
                    return element
                }
            }
            _ = RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.25))
        } while Date() < expiry
        throw NSError(domain: "SafariQA", code: 1, userInfo: [
            NSLocalizedDescriptionKey: "No matching hittable Safari element after \(seconds) seconds"
        ])
    }
}
