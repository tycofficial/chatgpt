import Foundation
import XCTest

final class SafariPublicSiteTests: XCTestCase {
    private let home = URL(string: "https://tycofficial.github.io/chatgpt/")!
    private let editorNames = ["prompt-textarea", "询问 ChatGPT", "问问 ChatGPT", "Ask ChatGPT", "Ask anything", "Message ChatGPT"]
    private let sendNames = ["send-button", "发送", "发送消息", "Send", "Send message"]
    private let reloadNames = ["Reload", "Reload Page", "Reload This Page", "reloadButton", "重新载入", "重新載入", "重新加载", "重新整理", "刷新"]

    @MainActor
    func testPublicSignupRefreshAndFollowUpInSafari() {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        mark("runner-started")
        safari.launch()
        guard check(safari.wait(for: .runningForeground, timeout: 20), "safari-foreground") else { return }
        mark("safari-foreground")

        safari.open(home)
        let web = safari.webViews.firstMatch
        guard check(web.waitForExistence(timeout: 40), "public-web-content") else { return }
        guard check(findEditor(in: web, timeout: 30) != nil, "public-editor") else { return }
        mark("public-editor")

        safari.open(home.appendingPathComponent("auth").appendingPathComponent("signup", isDirectory: true))
        guard let username = formField(web.textFields, names: ["site-username", "用户名", "Username"]), username.isHittable else {
            fail("signup-username")
            return
        }
        guard let password = formField(web.secureTextFields, names: ["site-password", "密码", "Password"]), password.isHittable else {
            fail("signup-password")
            return
        }
        mark("signup-form")
        let syntheticID = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        username.tap()
        username.typeText("qa_ipad_" + String(syntheticID.prefix(12)))
        password.tap()
        password.typeText("Qa9!" + UUID().uuidString.replacingOccurrences(of: "-", with: ""))
        let signup = named(web.buttons, ["继续", "Continue", "Sign up", "注册"])
        guard check(signup.waitForExistence(timeout: 10) && signup.isEnabled, "signup-submit") else { return }
        signup.tap()
        guard check(findEditor(in: web, timeout: 45) != nil, "signup-did-not-reach-chat") else { return }
        guard check(!username.exists && !password.exists, "signup-form-still-present") else { return }
        mark("signup-returned-to-chat")

        let token = "IPAD-QA-" + String(syntheticID.prefix(10))
        let firstPrompt = "Reply with exactly \(token) and no other text."
        guard send(firstPrompt, in: web, failure: "first-send") else { return }
        let firstUser = exactText(in: web, firstPrompt)
        let firstReply = exactText(in: web, String(token))
        guard check(firstUser.firstMatch.waitForExistence(timeout: 20), "first-prompt-missing") else { return }
        mark("first-send-visible")

        // Tap Safari's browser chrome so the normal navigation and storage lifecycle runs.
        let reload = named(safari.buttons, reloadNames)
        guard check(reload.waitForExistence(timeout: 10) && reload.isHittable, "safari-reload-control") else { return }
        mark(firstReply.firstMatch.exists ? "first-reply-before-reload" : "reload-while-reply-pending")
        reload.tap()
        mark("safari-reload-tapped")
        guard check(findEditor(in: web, timeout: 35) != nil, "editor-after-reload") else { return }
        guard check(firstReply.firstMatch.waitForExistence(timeout: 95), "first-reply-after-reload") else { return }
        guard check(firstUser.count == 1 && firstReply.count == 1, "first-transcript-duplicated") else { return }
        mark("first-conversation-restored")

        // The follow-up omits the earlier random token. Its answer proves preserved context.
        let followPrompt = "Reply with only the exact token from your previous answer with -NEXT appended."
        guard send(followPrompt, in: web, failure: "follow-up-send") else { return }
        mark("follow-up-sent")
        let followUser = exactText(in: web, followPrompt)
        let followReply = exactText(in: web, "\(token)-NEXT")
        guard check(followReply.firstMatch.waitForExistence(timeout: 95), "follow-up-context-missing") else { return }
        guard check(firstUser.count == 1 && firstReply.count == 1 && followUser.count == 1 && followReply.count == 1,
                    "follow-up-transcript-duplicated") else { return }
        mark("same-conversation-follow-up-verified")
    }

    @MainActor
    private func named(_ query: XCUIElementQuery, _ names: [String]) -> XCUIElement {
        query.matching(NSPredicate(format: "identifier IN %@ OR label IN %@ OR placeholderValue IN %@", names, names, names)).firstMatch
    }

    @MainActor
    private func formField(_ query: XCUIElementQuery, names: [String]) -> XCUIElement? {
        let preferred = named(query, names)
        if preferred.waitForExistence(timeout: 18) { return preferred }
        return query.count == 1 ? query.firstMatch : nil
    }

    @MainActor
    private func findEditor(in web: XCUIElement, timeout: TimeInterval) -> XCUIElement? {
        let preferred = named(web.descendants(matching: .any), editorNames)
        if preferred.waitForExistence(timeout: timeout) && preferred.isHittable { return preferred }
        return web.textViews.count == 1 && web.textViews.firstMatch.isHittable ? web.textViews.firstMatch : nil
    }

    @MainActor
    private func exactText(in web: XCUIElement, _ text: String) -> XCUIElementQuery {
        web.staticTexts.matching(NSPredicate(format: "label == %@ OR value == %@", text, text))
    }

    @MainActor
    private func send(_ prompt: String, in web: XCUIElement, failure: String) -> Bool {
        guard let editor = findEditor(in: web, timeout: 15) else { return check(false, failure + "-editor") }
        editor.tap()
        editor.typeText(prompt)
        let button = named(web.buttons, sendNames)
        guard check(button.waitForExistence(timeout: 10) && button.isEnabled, failure + "-control") else { return false }
        button.tap()
        return true
    }

    private func check(_ condition: Bool, _ phase: String) -> Bool {
        if !condition { fail(phase) }
        return condition
    }

    private func fail(_ phase: String) {
        mark("failed-" + phase)
        XCTFail("Safari UI QA failed at " + phase)
    }

    private func mark(_ event: String) {
        print("IPAD_UI_QA \(event)")
    }
}
