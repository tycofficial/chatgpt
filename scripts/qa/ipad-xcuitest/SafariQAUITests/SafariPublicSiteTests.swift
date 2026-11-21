import Foundation
import CoreGraphics
import XCTest

final class SafariPublicSiteTests: XCTestCase {
    private let editorNames = ["prompt-textarea", "询问 ChatGPT", "问问 ChatGPT", "Ask ChatGPT", "Ask anything", "Message ChatGPT"]
    private let sendNames = ["send-button", "发送", "发送消息", "Send", "Send message"]
    private let reloadNames = ["Reload", "Reload Page", "Reload This Page", "reloadButton", "重新载入", "重新載入", "重新加载", "重新整理", "刷新"]

    @MainActor
    func testPublicSignupRefreshAndFollowUpInSafari() {
        continueAfterFailure = false
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        mark("runner-started")
        safari.activate()
        guard check(safari.wait(for: .runningForeground, timeout: 20), "safari-foreground") else { return }
        mark("safari-foreground")

        // The runner has already opened the public registration URL in this Safari instance.
        let web = safari.webViews.firstMatch
        guard check(web.waitForExistence(timeout: 40), "public-signup-web-content") else { return }
        mark("public-signup-web-content")
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
        let syntheticName = "qaipad" + String(syntheticID.prefix(9))
        guard check(enterUsername(syntheticName, in: username, using: safari), "signup-username-not-entered") else { return }
        mark("signup-username-entered")
        guard check(focusWithKeyboard(password, using: safari), "signup-password-focus") else { return }
        safari.typeText("Qa9ipad" + UUID().uuidString.replacingOccurrences(of: "-", with: ""))
        let signup = named(safari.webViews.descendants(matching: .button), ["继续", "Continue", "Sign up", "注册"])
        guard check(signup.waitForExistence(timeout: 10) && signup.isEnabled, "signup-submit") else { return }
        signup.tap()
        mark("signup-submitted")
        guard check(username.waitForNonExistence(timeout: 60) && password.waitForNonExistence(timeout: 10), "signup-form-still-present") else { return }
        guard check(findEditor(in: safari, timeout: 55) != nil, "signup-did-not-reach-chat") else { return }
        mark("signup-returned-to-chat")

        let token = "IPAD-QA-" + String(syntheticID.prefix(10))
        let firstPrompt = "Reply with exactly \(token) and no other text."
        guard send(firstPrompt, in: safari, failure: "first-send") else { return }
        let firstUser = exactText(in: safari, firstPrompt)
        let firstReply = exactText(in: safari, String(token))
        guard check(firstUser.firstMatch.waitForExistence(timeout: 20), "first-prompt-missing") else { return }
        mark("first-send-visible")

        // Tap Safari's browser chrome so the normal navigation and storage lifecycle runs.
        let reload = named(safari.buttons, reloadNames)
        guard check(reload.waitForExistence(timeout: 10) && reload.isHittable, "safari-reload-control") else { return }
        mark(firstReply.firstMatch.exists ? "first-reply-before-reload" : "reload-while-reply-pending")
        reload.tap()
        mark("safari-reload-tapped")
        guard check(firstReply.firstMatch.waitForExistence(timeout: 95), "first-reply-after-reload") else { return }
        guard check(firstUser.count == 1 && firstReply.count == 1, "first-transcript-duplicated") else { return }
        mark("first-conversation-restored")

        // The follow-up omits the earlier random token. Its answer proves preserved context.
        let followPrompt = "Reply with only the exact token from your previous answer with -NEXT appended."
        guard send(followPrompt, in: safari, failure: "follow-up-send") else { return }
        mark("follow-up-sent")
        let followUser = exactText(in: safari, followPrompt)
        let followReply = exactText(in: safari, "\(token)-NEXT")
        guard check(followReply.firstMatch.waitForExistence(timeout: 95), "follow-up-context-missing") else { return }
        guard check(firstUser.count == 1 && firstReply.count == 1 && followUser.count == 1 && followReply.count == 1,
                    "follow-up-transcript-duplicated") else { return }
        mark("same-conversation-follow-up-verified")
    }

    @MainActor
    private func enterUsername(_ username: String, in field: XCUIElement, using safari: XCUIApplication) -> Bool {
        guard focusWithKeyboard(field, using: safari) else { return check(false, "signup-username-focus") }
        mark("signup-keyboard")
        safari.typeText(username)
        let deadline = Date().addingTimeInterval(5)
        repeat {
            if (field.value as? String)?.lowercased() == username { return true }
            settle(0.4)
        } while Date() < deadline
        return false
    }

    @MainActor
    private func focusWithKeyboard(_ field: XCUIElement, using safari: XCUIApplication) -> Bool {
        for attempt in 0..<3 {
            guard field.exists && field.isHittable else { return false }
            if attempt == 0 { field.tap() }
            else { field.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap() }
            if keyboardSettled(in: safari) { return true }
        }
        return false
    }

    @MainActor
    private func keyboardSettled(in safari: XCUIApplication) -> Bool {
        let keyboard = safari.keyboards.firstMatch
        guard keyboard.waitForExistence(timeout: 4) else { return false }
        settle(0.35)
        return keyboard.exists
    }

    private func settle(_ seconds: TimeInterval) {
        _ = RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(seconds))
    }

    @MainActor
    private func named(_ query: XCUIElementQuery, _ names: [String]) -> XCUIElement {
        namedMatches(query, names).firstMatch
    }

    @MainActor
    private func namedMatches(_ query: XCUIElementQuery, _ names: [String]) -> XCUIElementQuery {
        query.matching(NSPredicate(format: "identifier IN %@ OR label IN %@ OR placeholderValue IN %@ OR value IN %@", names, names, names, names))
    }

    @MainActor
    private func formField(_ query: XCUIElementQuery, names: [String]) -> XCUIElement? {
        let preferred = query.matching(NSPredicate(format: "identifier IN %@ OR label IN %@ OR placeholderValue IN %@",
                                                   names, names, names)).firstMatch
        if preferred.waitForExistence(timeout: 18) { return preferred }
        return query.count == 1 ? query.firstMatch : nil
    }

    @MainActor
    private func findEditor(in safari: XCUIApplication, timeout: TimeInterval) -> XCUIElement? {
        let views = safari.webViews.descendants(matching: .textView)
        let fields = safari.webViews.descendants(matching: .textField)
        let knownEditors = [named(views, editorNames), named(fields, editorNames),
                            named(safari.webViews.descendants(matching: .any), editorNames)]
        let deadline = Date().addingTimeInterval(timeout)
        repeat {
            if let editor = knownEditors.first(where: { $0.exists && $0.isHittable }) { return editor }
            if views.count == 1 && views.firstMatch.isHittable { return views.firstMatch }
            if fields.count == 1 && fields.firstMatch.isHittable { return fields.firstMatch }
            _ = RunLoop.current.run(mode: .default, before: Date().addingTimeInterval(0.8))
        } while Date() < deadline
        return nil
    }

    @MainActor
    private func exactText(in safari: XCUIApplication, _ text: String) -> XCUIElementQuery {
        safari.webViews.descendants(matching: .staticText).matching(NSPredicate(format: "label == %@ OR value == %@", text, text))
    }

    @MainActor
    private func send(_ prompt: String, in safari: XCUIApplication, failure: String) -> Bool {
        let button = named(safari.webViews.descendants(matching: .button), sendNames)
        guard check(button.waitForExistence(timeout: 15), failure + "-control") else { return false }
        var focused = false
        if let editor = findEditor(in: safari, timeout: 10) {
            focused = focusWithKeyboard(editor, using: safari)
        }
        if !focused && button.isHittable {
            // The original mobile composer keeps its editable area immediately left of Send.
            let frame = button.frame
            let distance = max(105, frame.width * 3)
            if frame.midX - distance > safari.webViews.firstMatch.frame.minX {
                button.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
                    .withOffset(CGVector(dx: -distance, dy: 0)).tap()
                focused = keyboardSettled(in: safari)
            }
        }
        guard check(focused, failure + "-editor-focus") else { return false }
        safari.typeText(prompt)
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
        FileHandle.standardOutput.write(Data("IPAD_UI_QA \(event)\n".utf8))
    }
}
