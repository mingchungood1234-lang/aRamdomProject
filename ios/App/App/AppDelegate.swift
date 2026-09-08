import UIKit
import WebKit
import AVFoundation
import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {

    private var progressObserver: NSKeyValueObservation?

    override var preferredStatusBarStyle: UIStatusBarStyle {
        // Crisp white status bar text flanking the Dynamic Island on dark theme
        return .lightContent
    }

    private func getAdSkipScript() -> String {
        let possibleUrls: [URL?] = [
            Bundle.main.url(forResource: "public/ads-skip", withExtension: "js"),
            Bundle.main.url(forResource: "ads-skip", withExtension: "js", subdirectory: "public"),
            Bundle.main.url(forResource: "ads-skip", withExtension: "js"),
            Bundle.main.resourceURL?.appendingPathComponent("public/ads-skip.js"),
            Bundle.main.bundleURL.appendingPathComponent("public/ads-skip.js")
        ]

        for url in possibleUrls {
            if let validUrl = url,
               let content = try? String(contentsOf: validUrl, encoding: .utf8),
               !content.isEmpty {
                return content
            }
        }
        return ""
    }

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)

        // Enable inline and background media playback
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let script = getAdSkipScript()
        if !script.isEmpty {
            // 1. Document Start: Instant CSS hiding + background audio API overrides before YouTube boots
            let startScript = WKUserScript(
                source: script,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
            config.userContentController.addUserScript(startScript)

            // 2. Document End: Video player observers, buttons, and event listeners
            let endScript = WKUserScript(
                source: script,
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: false
            )
            config.userContentController.addUserScript(endScript)
            print("[MainViewController] Successfully registered WKUserScript at documentStart and documentEnd.")
        } else {
            print("[MainViewController] Warning: Could not locate ads-skip.js in bundle")
        }

        return config
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Native iOS swipe navigation (swipe left/right to go back/forward in YouTube history)
        webView?.allowsBackForwardNavigationGestures = true
        // Allow CSS env(safe-area-inset-*) to manage Dynamic Island cleanly without clipping
        webView?.scrollView.contentInsetAdjustmentBehavior = .never

        // Active injection on navigation progress (ensures script executes on SPA navigation)
        progressObserver = webView?.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
            if webView.estimatedProgress >= 0.7 {
                let script = self?.getAdSkipScript() ?? ""
                if !script.isEmpty {
                    webView.evaluateJavaScript(script, completionHandler: nil)
                }
            }
        }
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Activate iOS Background Audio playback session
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Failed to set audio session category: \(error)")
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
