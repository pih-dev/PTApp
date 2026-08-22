package com.spotset.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // v2.28: the opening sound. Android WebView refuses media playback
        // before a user gesture by default; the whole point of an OPENING
        // sound is that it plays at launch, so the native shell lifts the
        // gesture requirement. The web build never reaches this — the splash
        // only plays audio when Capacitor reports a native platform, and the
        // wav is not deployed to gh-pages at all.
        this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
