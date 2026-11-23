import XCTest

final class SafariPublicSiteTests: XCTestCase {
    private let workNames = ["Work", "工作"]
    private let modelNames = ["Choose ChatGPT model", "Choose model", "选择 ChatGPT 模型", "选择模型"]
    private let sendNames = ["Send", "Send message", "Send prompt", "发送", "发送消息", "发送提示"]
    private let editorNames = ["prompt-textarea", "使用 ChatGPT Work", "Use ChatGPT Work", "Ask anything", "Message", "发消息", "询问任何问题", "想要了解什么？"]
    private let reloadNames = ["Reload", "Reload Page", "Reload This Page", "reloadButton", "重新载入", "重新載入", "重新加载", "重新整理", "刷新"]

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testWorkTogglesAndBrowserChromeReload() throws {
        XCUIDevice.shared.orientation = .landscapeLeft
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 20), "Safari is not foregrounded")
        let web = safari.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 35), "Fixture web view did not start")

        print("IPAD_QA safari-webview-visible")
        try exerciseWork(safari, web, phrase: "ipad work before reload")
        print("IPAD_QA work-before-toolbar-reload")

        let reload = try waitForHittable(named(reloadNames, in: safari.buttons), seconds: 12)
        reload.tap()
        print("IPAD_QA browser-toolbar-reload-tapped")

        try exerciseWork(safari, web, phrase: "ipad work after reload")
        print("IPAD_QA work-after-toolbar-reload")
    }

    private func exerciseWork(_ safari: XCUIApplication, _ web: XCUIElement, phrase: String) throws {
        let candidates = [named(workNames, in: web.buttons), named(workNames, in: web.descendants(matching: .any))]
        let work: XCUIElement
        do {
            work = try waitForHittable(candidates, seconds: 50)
        } catch {
            let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            attachment.name = "Safari before Work selection"
            attachment.lifetime = .keepAlways
            add(attachment)
            let sample = web.debugDescription.prefix(2500)
            print("IPAD_QA web-view hierarchy: \(sample)")
            throw error
        }
        print("IPAD_QA tappable Work selector found")
        let workIsSelected = NSPredicate { _, _ in
            let state = String(describing: work.value ?? "").lowercased()
            return work.isSelected || ["1", "true", "on", "打开", "已打开"].contains(state)
        }
        if !workIsSelected.evaluate(with: work) {
            work.tap()
        }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: workIsSelected, object: work)], timeout: 12),
                       .completed, "The native Work switch did not remain selected")
        print("IPAD_QA native-work-mode-selected")

        let model = named(modelNames, in: web.descendants(matching: .any))
        let curated = web.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] %@", "6.2 Sol"))
        let picker = try waitForHittable([model, curated], seconds: 20)
        print("IPAD_QA native-work-model-control-visible")
        picker.tap()
        let effort = named(["轻度", "Low", "提高思考力", "Thinking effort"], in: web.descendants(matching: .any))
        _ = try waitForHittable(effort, seconds: 12)
        picker.tap()
        print("IPAD_QA native-work-model-options-visible")

        let editor = try waitForHittable(
            [named(editorNames, in: web.descendants(matching: .any)), web.textViews, web.textFields],
            seconds: 15
        )
        editor.tap()
        safari.typeText(phrase)
        let send = try waitForHittable(named(sendNames, in: web.buttons), seconds: 12)
        XCTAssertTrue(send.isEnabled, "The focused Work input did not enable Send")
        let typed = NSPredicate { _, _ in
            (editor.value as? String)?.contains(phrase) == true ||
            web.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", phrase)).firstMatch.exists
        }
        XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: typed, object: nil)], timeout: 8),
                       .completed, "Could not verify the typed Work draft")

        let hideKeyboard = named(["Hide keyboard", "Dismiss keyboard", "隐藏键盘", "关闭键盘"], in: safari.keyboards.buttons).firstMatch
        if hideKeyboard.exists && hideKeyboard.isHittable {
            hideKeyboard.tap()
        }
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
            RunLoop.current.run(until: Date().addingTimeInterval(0.2))
        } while Date() < expiry
        throw NSError(domain: "SafariQA", code: 1, userInfo: [
            NSLocalizedDescriptionKey: "No matching hittable Safari element after \(seconds) seconds"
        ])
    }
}
