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
        let inferencePosts: Int
        let inferenceCalls: Int
        let inferenceRequestIds: [String]
        let request: RequestMetrics?
        let savedWorkThreads: [SavedThread]
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

        let replies = matchingText(answer, in: web)
        _ = try waitForHittable(replies, seconds: 65)
        let before = try await waitForMetrics { !$0.savedWorkThreads.isEmpty }
        let savedThread = try XCTUnwrap(before.savedWorkThreads.first)
        XCTAssertEqual(before.savedWorkThreads.count, 1)
        XCTAssertEqual(savedThread.replyItems, 1, "One assistant reply must be saved before Safari reload")
        XCTAssertEqual(before.inferencePosts, 1)
        XCTAssertEqual(before.inferenceCalls, 1)
        XCTAssertEqual(before.inferenceRequestIds.count, 1)
        XCTAssertEqual(before.request?.model, "gpt-6.2-sol")
        XCTAssertEqual(before.request?.effort, "low")
        XCTAssertEqual(before.request?.expectedPrompt, true)
        XCTAssertEqual(before.request?.stream, true)
        XCTAssertEqual(savedThread.model, "gpt-6.2-sol")
        XCTAssertEqual(savedThread.effort, "low")
        print("IPAD_QA work-model-effort-and-first-visible-reply-verified")

        let hideKeyboard = named(["Hide keyboard", "Dismiss keyboard", "隐藏键盘", "关闭键盘"], in: safari.keyboards.buttons).firstMatch
        if hideKeyboard.exists && hideKeyboard.isHittable { hideKeyboard.tap() }
        tapReload(try waitForHittable(named(reloadNames, in: safari.buttons), seconds: 18))
        var reloaded = try await waitForMetrics { $0.documentLoads > before.documentLoads }
        if !loadedSavedRoute(reloaded, after: before.documentLoads, id: savedThread.id) {
            let historyTitle = [savedThread.title]
            let historyEntry = try waitForHittable([
                named(historyTitle, in: web.buttons),
                named(historyTitle, in: web.links),
                named(historyTitle, in: web.staticTexts),
            ], seconds: 28)
            historyEntry.tap()
            _ = try waitForHittable(replies, seconds: 55)
            print("IPAD_QA reopened-the-saved-work-chat-from-history")
            let priorLoads = reloaded.documentLoads
            tapReload(try waitForHittable(named(reloadNames, in: safari.buttons), seconds: 18))
            reloaded = try await waitForMetrics { $0.documentLoads > priorLoads }
        }
        XCTAssertTrue(loadedSavedRoute(reloaded, after: before.documentLoads, id: savedThread.id), "Safari must reload the exact persisted Work route")
        _ = try waitForHittable(replies, seconds: 65)
        _ = try waitForHittable(matchingText(prompt, in: web), seconds: 15)
        let after = try await fixtureMetrics()
        XCTAssertEqual(after.savedWorkThreads, [savedThread], "The original saved Work ID, reply, model or effort changed")
        XCTAssertEqual(after.inferenceRequestIds, before.inferenceRequestIds)
        XCTAssertEqual(after.inferencePosts, 1)
        XCTAssertEqual(after.inferenceCalls, 1)
        print("IPAD_QA same-work-conversation-restored-one-inference-\(savedThread.id)")
    }

    private func tapReload(_ control: XCUIElement) {
        control.tap()
        print("IPAD_QA browser-toolbar-reload-tapped")
    }

    private func loadedSavedRoute(_ metrics: FixtureMetrics, after loads: Int, id: String) -> Bool {
        metrics.documentLocations.dropFirst(loads).contains { location in
            location.split(separator: "?", maxSplits: 1).first?.hasSuffix("/c/" + id) == true
        }
    }

    private func matchingText(_ text: String, in web: XCUIElement) -> XCUIElementQuery {
        web.staticTexts.matching(NSPredicate(format: "label == %@ OR value == %@", text, text))
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
        let last = try await fixtureMetrics()
        throw NSError(domain: "SafariQA", code: 2, userInfo: [
            NSLocalizedDescriptionKey: "Safari metrics did not converge. Documents=\(last.documentLocations), saved IDs=\(last.savedWorkThreads.map(\.id)), POSTs=\(last.inferencePosts), executions=\(last.inferenceCalls)"
        ])
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
