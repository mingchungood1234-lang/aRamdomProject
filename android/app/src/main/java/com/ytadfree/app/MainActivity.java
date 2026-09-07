package com.ytadfree.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private String adSkipScript = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Preload ad-skip script from assets
        loadScriptFromAssets();

        // Enable media playback without gesture
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        }

        // Register WebViewListener to inject script on page load and visibility commit
        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView webView, String url) {
                injectScript(webView);
            }

            @Override
            public void onPageLoaded(WebView webView) {
                injectScript(webView);
            }
        });
    }

    private void loadScriptFromAssets() {
        try {
            InputStream is = getAssets().open("public/ads-skip.js");
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            reader.close();
            adSkipScript = sb.toString();
            Log.d(TAG, "Ad-skip script loaded successfully from assets.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to load ads-skip.js from assets", e);
        }
    }

    private void injectScript(WebView webView) {
        if (adSkipScript == null) {
            loadScriptFromAssets();
        }
        if (adSkipScript != null && webView != null) {
            webView.post(() -> {
                webView.evaluateJavascript(adSkipScript, null);
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (bridge != null && bridge.getWebView() != null && bridge.getWebView().canGoBack()) {
            bridge.getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }
}
