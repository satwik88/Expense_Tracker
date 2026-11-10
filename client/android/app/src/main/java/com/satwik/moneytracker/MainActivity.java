package com.satwik.moneytracker;

import android.app.ActivityManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String PREFS_NAME = "MoneyTrackerPrefs";
    private static final String KEY_THEME = "app_theme";

    private View privacyOverlay;
    private String currentTheme = "light";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeThemePlugin.class);
        super.onCreate(savedInstanceState);

        // Security requirement: prevent untrusted screenshots/screen recording
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);

        // Read stored theme from persistent SharedPreferences on startup
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        currentTheme = prefs.getString(KEY_THEME, "light");

        // Apply native styling immediately on activity creation
        applyNativeTheme(currentTheme);
    }

    /**
     * Called by NativeThemePlugin whenever the React app initializes or changes theme.
     */
    public void applyTheme(String theme) {
        if (theme == null) return;
        currentTheme = theme;

        // Persist to SharedPreferences so native layer remembers on app restart
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_THEME, theme).apply();

        runOnUiThread(() -> applyNativeTheme(theme));
    }

    private void applyNativeTheme(String theme) {
        boolean isDark = "dark".equalsIgnoreCase(theme);
        int bgColor = isDark ? Color.BLACK : Color.WHITE;

        Window window = getWindow();
        if (window == null) return;

        // 1. Native window background
        window.setBackgroundDrawable(new ColorDrawable(bgColor));

        // 2. Navigation bar color
        window.setNavigationBarColor(bgColor);

        // 3. Status bar and Navigation bar icon appearance (light vs dark icons)
        View decorView = window.getDecorView();
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(window, decorView);
        // Light theme requires dark icons; Dark theme requires light (non-dark) icons
        controller.setAppearanceLightNavigationBars(!isDark);
        controller.setAppearanceLightStatusBars(!isDark);

        // 4. Android Recent Apps description header
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            setTaskDescription(new ActivityManager.TaskDescription.Builder()
                .setPrimaryColor(bgColor)
                .build());
        } else {
            setTaskDescription(new ActivityManager.TaskDescription(null, null, bgColor));
        }

        // Update privacy overlay color if active
        if (privacyOverlay != null) {
            privacyOverlay.setBackgroundColor(bgColor);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        showPrivacyOverlay();
    }

    @Override
    public void onStop() {
        super.onStop();
        showPrivacyOverlay();
    }

    @Override
    public void onResume() {
        super.onResume();
        hidePrivacyOverlay();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hidePrivacyOverlay();
        }
    }

    private void showPrivacyOverlay() {
        runOnUiThread(() -> {
            boolean isDark = "dark".equalsIgnoreCase(currentTheme);
            int bgColor = isDark ? Color.BLACK : Color.WHITE;

            if (privacyOverlay == null) {
                privacyOverlay = new View(this);
                privacyOverlay.setLayoutParams(new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ));
                ViewGroup root = findViewById(android.R.id.content);
                if (root != null) {
                    root.addView(privacyOverlay);
                }
            }
            privacyOverlay.setBackgroundColor(bgColor);
            privacyOverlay.setVisibility(View.VISIBLE);
            privacyOverlay.bringToFront();
        });
    }

    private void hidePrivacyOverlay() {
        runOnUiThread(() -> {
            if (privacyOverlay != null) {
                privacyOverlay.setVisibility(View.GONE);
            }
        });
    }
}
