import Foundation
import CoreGraphics
import XCTest

final class SafariPublicSiteTests: XCTestCase {
    private let editorNames = ["prompt-textarea", "询问 ChatGPT", "问问 ChatGPT", "Ask ChatGPT", "Ask anything", "Message ChatGPT"]
    private let sendNames = ["send-button", "发送", "发送消息", "Send", "Send message"]
    private let reloadNames = ["Reload", "Reload Page", "Reload This Page", "reloadButton", "重新载入", "重新載入", "重新加载", "重新整理", "刷新"]

    @MainActor
    func testPublicLoginRefreshAndFollowUpInSafari() async {
        continueAfterFailure = false
        mark("runner-started")
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        safari.activate()
        guard check(safari.wait(for: .runningForeground, timeout: 20), "safari-foreground") else { return }
        mark("safari-foreground")

        let web = safari.webViews.firstMatch
        guard check(web.waitForExistence(timeout: 40), "public-login-web-content") else { return }
        mark("public-login-web-content")
        let submit = named(web.buttons, ["继续", "Continue"])
        let deadline = Date().addingTimeInterval(45)
        var loginFields: (username: XCUIElement, password: XCUIElement)?
        repeat {
            if let username = formField(web.textFields, names: ["site-username", "用户名", "Username"]),
               let password = formField(web.secureTextFields, names: ["site-password", "密码", "Password"]),
               submit.exists, username.isHittable, password.isHittable {
                loginFields = (username, password)
                break
            }
            try? await Task.sleep(for: .milliseconds(500))
        } while Date() < deadline
        guard let (username, password) = loginFields else {
            fail("login-form-incomplete")
            return
        }
        mark("login-form")

        // Create a test account only after Safari exposes the normal login form.
        let syntheticID = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        let syntheticName = "qaipad" + String(syntheticID.prefix(9))
        let syntheticPassword = "Qa9ipad" + UUID().uuidString.replacingOccurrences(of: "-", with: "")
        let registered = await registerSyntheticAccount(username: syntheticName, password: syntheticPassword)
        guard check(registered, "seed-public-account") else { return }
        mark("seeded-public-account")
        let emptyPasswordValue = password.value as? String
        guard check(enterUsername(syntheticName, in: username, using: safari), "login-username-not-entered") else { return }
        mark("login-username-entered")
        safari.typeKey(.tab, modifierFlags: [])
        let movedToPassword = password.wait(for: \.hasFocus, toEqual: true, timeout: 4)
        guard check(movedToPassword || focusWithKeyboard(password, using: safari), "login-password-focus") else { return }
        password.typeText(syntheticPassword)
        guard check(waitForSecureValue(in: password, differentFrom: emptyPasswordValue), "login-password-typed-value") else { return }
        mark("login-password-entered")
        guard check(submit.waitForExistence(timeout: 10) && submit.isEnabled, "login-submit") else { return }
        submit.tap()
        mark("login-submitted")
        guard check(username.waitForNonExistence(timeout: 60) && password.waitForNonExistence(timeout: 10), "login-form-still-present") else { return }
        guard check(findEditor(in: safari, timeout: 55) != nil, "login-did-not-reach-chat") else { return }
        mark("login-returned-to-chat")

        let token = "IPAD-QA-" + String(syntheticID.prefix(10))
        let firstPrompt = "Reply with exactly \(token) and no other text."
        guard send(firstPrompt, in: safari, failure: "first-send") else { return }
        mark("first-send-submitted")
        let firstUser = matchingText(in: safari, firstPrompt)
        let firstReply = matchingText(in: safari, token)
        if firstUser.firstMatch.waitForExistence(timeout: 4) { mark("first-send-visible") }

        // Tap Safari's browser chrome so the normal navigation and storage lifecycle runs.
        let reload = named(safari.buttons, reloadNames)
        guard check(reload.waitForExistence(timeout: 10) && reload.isHittable, "safari-reload-control") else { return }
        mark(firstReply.firstMatch.exists ? "first-reply-before-reload" : "reload-while-reply-pending")
        reload.tap()
        mark("safari-reload-tapped")
        guard check(firstReply.firstMatch.waitForExistence(timeout: 95), "first-reply-after-reload") else { return }
        mark("first-reply-restored")
        let restoredCounts = transcriptCounts(firstUser, firstReply, stage: "restored")
        // Safari can expose the short user prompt in both the title and the transcript.
        // The exact assistant token cannot appear in that title on its own.
        if restoredCounts.0 >= 1 && restoredCounts.1 == 1 { mark("first-conversation-restored") }

        // The follow-up omits the earlier random token. Its answer proves preserved context.
        let followPrompt = "Reply with only the exact token from your previous answer with -NEXT appended."
        guard send(followPrompt, in: safari, failure: "follow-up-send") else { return }
        mark("follow-up-sent")
        let followUser = matchingText(in: safari, followPrompt)
        let followReply = matchingText(in: safari, "\(token)-NEXT")
        guard check(followReply.firstMatch.waitForExistence(timeout: 95), "follow-up-context-missing") else { return }
        mark("same-conversation-follow-up-verified")
        let followCounts = transcriptCounts(followUser, followReply, stage: "follow-up")
        _ = check(restoredCounts.0 >= 1 && restoredCounts.1 == 1 && followCounts.0 >= 1 && followCounts.1 == 1,
                  "transcript-count-mismatch")
    }


    private func registerSyntheticAccount(username: String, password: String) async -> Bool {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 20
        let client = URLSession(configuration: configuration)
        defer { client.finishTasksAndInvalidate() }
        guard let endpoint = URL(string: "https://chatgpt-admin-bridge-tyc.hushedtarragon1.chatgpt.site/auth/register") else { return false }
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("https://tycofficial.github.io", forHTTPHeaderField: "Origin")
        do {
            request.httpBody = try JSONEncoder().encode(["username": username, "password": password])
            let (_, response) = try await client.data(for: request)
            guard let status = (response as? HTTPURLResponse)?.statusCode else { return false }
            return (200..<300).contains(status)
        } catch {
            return false
        }
    }

    @MainActor
    private func enterUsername(_ username: String, in field: XCUIElement, using safari: XCUIApplication) -> Bool {
        guard focusWithKeyboard(field, using: safari) else { return check(false, "login-username-focus") }
        mark("login-keyboard")
        safari.typeText(username)
        let deadline = Date().addingTimeInterval(5)
        repeat {
            if (field.value as? String)?.lowercased() == username { return true }
            settle(0.4)
        } while Date() < deadline
        return false
    }

    @MainActor
    private func hasSecureValue(in field: XCUIElement, differentFrom initialValue: String?) -> Bool {
        guard field.exists, let value = field.value as? String else { return false }
        return value != initialValue && value.count >= 8
    }

    @MainActor
    private func waitForSecureValue(in field: XCUIElement, differentFrom initialValue: String?) -> Bool {
        let deadline = Date().addingTimeInterval(8)
        repeat {
            if hasSecureValue(in: field, differentFrom: initialValue) { return true }
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
        if preferred.exists { return preferred }
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
    private func matchingText(in safari: XCUIApplication, _ text: String) -> XCUIElementQuery {
        safari.webViews.descendants(matching: .staticText)
            .matching(NSPredicate(format: "label == %@ OR value == %@", text, text))
    }

    @MainActor
    private func transcriptCounts(_ user: XCUIElementQuery, _ reply: XCUIElementQuery, stage: String) -> (Int, Int) {
        _ = user.firstMatch.waitForExistence(timeout: 10)
        let userCount = user.count
        let replyCount = reply.count
        mark("\(stage)-transcript-user-\(userCount)-reply-\(replyCount)")
        return (userCount, replyCount)
    }

    @MainActor
    private func send(_ prompt: String, in safari: XCUIApplication, failure: String) -> Bool {
        let button = named(safari.webViews.descendants(matching: .button), sendNames)
        var focused = false
        if let editor = findEditor(in: safari, timeout: 10) {
            focused = focusWithKeyboard(editor, using: safari)
        }
        if !focused && button.exists && button.isHittable {
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
