import UIKit
import WebKit
import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {

    override var preferredStatusBarStyle: UIStatusBarStyle {
        // Crisp white status bar icons next to the Dynamic Island on dark theme
        return .lightContent
    }

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)

        // Attempt to load ads-skip.js from the bundled public directory
        var scriptContent: String?
        if let path = Bundle.main.path(forResource: "ads-skip", ofType: "js", inDirectory: "public") {
            scriptContent = try? String(contentsOfFile: path, encoding: .utf8)
        } else if let path = Bundle.main.path(forResource: "ads-skip", ofType: "js") {
            scriptContent = try? String(contentsOfFile: path, encoding: .utf8)
        }

        if let script = scriptContent {
            let userScript = WKUserScript(
                source: script,
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: false
            )
            config.userContentController.addUserScript(userScript)
            print("[MainViewController] Successfully injected ads-skip.js WKUserScript")
        } else {
            print("[MainViewController] Warning: Could not locate ads-skip.js in bundle")
        }

        return config
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Enable iOS native swipe navigation (swipe left/right to navigate history)
        webView?.allowsBackForwardNavigationGestures = true
        // Allow CSS env(safe-area-inset-*) to manage Dynamic Island & Notch cleanly
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
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
