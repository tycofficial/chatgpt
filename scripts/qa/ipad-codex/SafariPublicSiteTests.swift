import Foundation
import XCTest

final class SafariPublicSiteTests: XCTestCase {
    private let exploreNames = ["Explore", "探索", "Your stuff", "你的内容"]
    private let codexName = ["Codex"]
    private let sidebarNames = ["Toggle sidebar", "Open sidebar", "显示/隐藏侧边栏", "打开侧边栏"]
    private let sendNames = ["send-button", "Send", "Send message", "发送", "发送消息"]
    private let editorNames = ["prompt-textarea"]
    private let reloadNames = ["Reload", "Reload Page", "Reload This Page", "reloadButton", "重新载入", "重新載入", "重新加载", "重新整理", "刷新"]
    private let prompt = "Verify the saved Codex conversation with a short acknowledgment."
    private let answer = "iPad Codex recovery fixture response."
    private let followPrompt = "Give a second short acknowledgment in this same saved Codex conversation."
    private let followAnswer = "iPad Codex saved conversation follow-up response."

    private struct RequestMetrics: Decodable {
        let model: String
        let effort: String?
        let expectedPrompt: Bool
        let stream: Bool
        let followup: Bool
        let includesPriorReply: Bool
    }

    private struct SavedThread: Decodable, Equatable {
        let id: String
        let title: String
        let model: String
        let effort: String
        let replyItems: Int
        let followupItems: Int
    }

    private struct FixtureMetrics: Decodable {
        let documentLoads: Int
        let documentLocations: [String]
        let inferencePosts: Int
        let inferenceCalls: Int
        let inferenceRequestIds: [String]
        let requests: [RequestMetrics]
        let savedCodexThreads: [SavedThread]
        let disconnectedStreams: Int
        let unavailableReceiptReads: Int
        let recoveredReceiptReads: Int
    }

    @MainActor
    func testCodexEntryAndBrowserChromeRecovery() async throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .landscapeLeft
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20), "Safari is not foregrounded")
        let web = safari.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 35), "Fixture web view did not start")

        try openNativeCodex(in: web)

        let editor = try waitForHittable([named(editorNames, in: web.textViews), web.textViews], seconds: 25)
        editor.tap()
        safari.typeText(prompt)
        let send = try waitForHittable(named(sendNames, in: web.buttons), seconds: 15)
        XCTAssertTrue(send.isEnabled, "The Codex composer did not enable Send")
        send.tap()
        print("IPAD_QA native-codex-request-submitted")

        let replies = matchingText(answer, in: web)
        _ = try waitForHittable(replies, seconds: 65)
        print("IPAD_QA first-assistant-reply-visible-before-sync-check")
        let before = try await waitForMetrics { !$0.savedCodexThreads.isEmpty }
        let savedThread = try XCTUnwrap(before.savedCodexThreads.first)
        XCTAssertEqual(before.savedCodexThreads.count, 1)
        XCTAssertEqual(savedThread.replyItems, 1, "One assistant reply must be saved before Safari reload")
        XCTAssertEqual(before.inferencePosts, 1)
        XCTAssertEqual(before.inferenceCalls, 1)
        XCTAssertEqual(before.inferenceRequestIds.count, 1)
        XCTAssertEqual(before.requests.first?.model, "gpt-6.2-sol")
        XCTAssertEqual(before.requests.first?.effort, "low")
        XCTAssertEqual(before.requests.first?.expectedPrompt, true)
        XCTAssertEqual(before.requests.first?.stream, true)
        XCTAssertEqual(savedThread.model, "gpt-6.2-sol")
        XCTAssertEqual(savedThread.effort, "low")
        print("IPAD_QA codex-model-effort-and-first-visible-reply-verified")

        let hideKeyboard = named(["Hide keyboard", "Dismiss keyboard", "隐藏键盘", "关闭键盘"], in: safari.keyboards.buttons).firstMatch
        if hideKeyboard.exists && hideKeyboard.isHittable { hideKeyboard.tap() }
        tapReload(try waitForHittable(named(reloadNames, in: safari.buttons), seconds: 18))
        let reloaded = try await waitForMetrics { $0.documentLoads > before.documentLoads }
        XCTAssertTrue(loadedSavedRoute(reloaded, after: before.documentLoads, id: savedThread.id), "Safari must reload the exact persisted Codex route")
        _ = try waitForHittable(replies, seconds: 65)
        _ = try waitForHittable(matchingText(prompt, in: web), seconds: 15)
        let after = try await fixtureMetrics()
        XCTAssertEqual(after.savedCodexThreads, [savedThread], "The original saved Codex ID, reply, model or effort changed")
        XCTAssertEqual(after.inferenceRequestIds, before.inferenceRequestIds)
        XCTAssertEqual(after.inferencePosts, 1)
        XCTAssertEqual(after.inferenceCalls, 1)
        print("IPAD_QA same-codex-conversation-restored-one-inference-\(savedThread.id)")

        try closeSafariTab(safari)
        XCTAssertTrue(replies.firstMatch.waitForNonExistence(timeout: 22), "The closed Safari tab still shows the Codex reply")
        print("IPAD_QA closed-codex-safari-tab")

        openSavedURL("https://127.0.0.1:4400/chatgpt/local/" + savedThread.id, in: safari)
        _ = try await waitForMetrics { loadedSavedRoute($0, after: after.documentLoads, id: savedThread.id) }
        _ = try waitForHittable(replies, seconds: 65)
        _ = try waitForHittable(matchingText(prompt, in: web), seconds: 15)
        let reopened = try await fixtureMetrics()
        XCTAssertEqual(reopened.savedCodexThreads, [savedThread])
        XCTAssertEqual(reopened.inferenceRequestIds, before.inferenceRequestIds)
        XCTAssertEqual(reopened.inferencePosts, 1)
        XCTAssertEqual(reopened.inferenceCalls, 1)
        print("IPAD_QA new-safari-tab-reopened-same-codex-text-and-id")

        let followEditor = try waitForHittable([named(editorNames, in: web.textViews), web.textViews], seconds: 28)
        followEditor.tap()
        safari.typeText(followPrompt)
        let followSend = try waitForHittable(named(sendNames, in: web.buttons), seconds: 18)
        XCTAssertTrue(followSend.isEnabled)
        followSend.tap()
        print("IPAD_QA submitted-same-codex-thread-followup")
        _ = try waitForHittable(matchingText(followAnswer, in: web), seconds: 65)
        _ = try waitForHittable(replies, seconds: 15)
        let final = try await waitForMetrics { $0.savedCodexThreads.first?.followupItems == 1 }
        XCTAssertEqual(final.savedCodexThreads.count, 1)
        XCTAssertEqual(final.savedCodexThreads.first?.id, savedThread.id)
        XCTAssertEqual(final.savedCodexThreads.first?.replyItems, 1)
        XCTAssertEqual(final.savedCodexThreads.first?.followupItems, 1)
        XCTAssertEqual(final.inferencePosts, 2)
        XCTAssertEqual(final.inferenceCalls, 2)
        XCTAssertEqual(final.inferenceRequestIds.count, 2)
        XCTAssertEqual(Set(final.inferenceRequestIds).count, 2)
        XCTAssertEqual(final.inferenceRequestIds.first, before.inferenceRequestIds.first)
        XCTAssertEqual(final.requests.last?.model, "gpt-6.2-sol")
        XCTAssertEqual(final.requests.last?.effort, "low")
        XCTAssertEqual(final.requests.last?.followup, true)
        XCTAssertEqual(final.requests.last?.includesPriorReply, true)
        XCTAssertEqual(final.disconnectedStreams, 1)
        XCTAssertEqual(final.unavailableReceiptReads, 1)
        XCTAssertGreaterThan(final.recoveredReceiptReads, 0)
        print("IPAD_QA visible-followup-restored-from-receipt-after-fixture-disconnect")
    }

    @MainActor
    private func openNativeCodex(in web: XCUIElement) throws {
        let descendants = web.descendants(matching: .any)
        let namedRail = [named(exploreNames, in: web.buttons), named(exploreNames, in: descendants)]
        let switcher = web.buttons.matching(NSPredicate(format:
            "label BEGINSWITH[c] %@ OR label BEGINSWITH[c] %@",
            "Switch mode, current mode:", "切换模式，当前模式："))
        let codexMenuItem = web.menuItems.matching(NSPredicate(format:
            "label ==[c] %@ OR label BEGINSWITH[c] %@ OR label BEGINSWITH[c] %@", "Codex", "Codex,", "Codex "))
        let codexItems = [named(codexName, in: web.buttons), codexMenuItem, named(codexName, in: descendants)]
        if !namedRail.contains(where: { visible($0) != nil }), visible(switcher) == nil,
           let sidebar = visible(named(sidebarNames, in: web.buttons)) { sidebar.tap() }

        if !codexItems.contains(where: { visible($0) != nil }) {
            if let menu = try? waitForHittable(namedRail + [switcher], seconds: 12) {
                menu.tap()
                print("IPAD_QA native-codex-named-menu-tapped")
            } else {
                _ = try waitForHittable([named(editorNames, in: web.textViews), web.textViews], seconds: 15)
                let frame = web.frame
                // The recorded iPad A16 landscape fixture has a 52-point rail.
                // Explore is its fifth icon and its name comes from sr-only text.
                guard abs(frame.width - 1180) <= 2, abs(frame.minX) <= 2,
                      abs(frame.minY - 86) <= 18, frame.height >= 680 else {
                    let controls = web.buttons.allElementsBoundByIndex.filter { $0.isHittable }.prefix(16).map { $0.label }
                    print("IPAD_QA native-home-buttons \(controls)")
                    throw NSError(domain: "SafariQA", code: 3, userInfo: [
                        NSLocalizedDescriptionKey: "No named Codex menu on the measured landscape rail. Web frame: \(frame)"
                    ])
                }
                web.coordinate(withNormalizedOffset: CGVector(dx: 26 / frame.width, dy: 234 / frame.height)).tap()
                print("IPAD_QA native-codex-measured-rail-tapped")
            }
        }
        try waitForHittable(codexItems, seconds: 25).tap()
        print("IPAD_QA native-codex-entry-tapped")
    }

    @MainActor
    private func closeSafariTab(_ safari: XCUIApplication) throws {
        let close = safari.buttons.matching(NSPredicate(format:
            "identifier CONTAINS[c] %@ OR label BEGINSWITH[c] %@ OR label IN[c] %@",
            "CloseTab", "Close Tab", ["关闭标签页", "关掉标签页"]))
        if let control = visible(close) {
            control.tap()
            return
        }
        let tabs = named(["Tabs", "Show Tabs", "Show Tab Overview", "Tab Overview", "TabOverviewButton", "标签页", "显示标签页"], in: safari.buttons)
        if let overview = visible(tabs) {
            overview.tap()
            let closeFromOverview = try waitForHittable([close, named(["Close", "关闭"], in: safari.buttons)], seconds: 8)
            closeFromOverview.tap()
            return
        }
        safari.typeKey("w", modifierFlags: .command)
    }

    @MainActor
    private func openSavedURL(_ url: String, in safari: XCUIApplication) {
        let addTab = named(["New Tab", "Add Tab", "AddTabButton", "NewTabButton", "新建标签页", "新标签页"], in: safari.buttons)
        if let control = visible(addTab) { control.tap() }
        else { safari.typeKey("t", modifierFlags: .command) }
        let address = named(["Address", "Address Bar", "URL", "Search or enter website name", "Smart Search Field", "搜索或输入网站名称"], in: safari.textFields)
        if let field = visible(address) { field.tap() }
        else { safari.typeKey("l", modifierFlags: .command) }
        safari.typeText(url + "\n")
    }

    private func visible(_ query: XCUIElementQuery) -> XCUIElement? {
        query.allElementsBoundByIndex.first(where: { $0.exists && $0.isHittable })
    }

    private func tapReload(_ control: XCUIElement) {
        control.tap()
        print("IPAD_QA browser-toolbar-reload-tapped")
    }

    private func loadedSavedRoute(_ metrics: FixtureMetrics, after loads: Int, id: String) -> Bool {
        metrics.documentLocations.dropFirst(loads).contains { location in
            location.split(separator: "?", maxSplits: 1).first.map { String($0) } == "/chatgpt/local/" + id
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

    @MainActor
    private func waitForMetrics(_ matches: (FixtureMetrics) -> Bool) async throws -> FixtureMetrics {
        let expiry = Date().addingTimeInterval(25)
        repeat {
            let metrics = try await fixtureMetrics()
            if matches(metrics) { return metrics }
            try await Task.sleep(for: .milliseconds(300))
        } while Date() < expiry
        let last = try await fixtureMetrics()
        let evidence = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        evidence.name = "Safari at the recovery assertion"
        evidence.lifetime = .keepAlways
        add(evidence)
        throw NSError(domain: "SafariQA", code: 2, userInfo: [
            NSLocalizedDescriptionKey: "Safari metrics did not converge. Documents=\(last.documentLocations), saved IDs=\(last.savedCodexThreads.map(\.id)), POSTs=\(last.inferencePosts), executions=\(last.inferenceCalls)"
        ])
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
                if let element = visible(query) {
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
