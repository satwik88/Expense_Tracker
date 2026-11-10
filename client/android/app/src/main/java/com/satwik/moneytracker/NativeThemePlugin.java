package com.satwik.moneytracker;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeTheme")
public class NativeThemePlugin extends Plugin {

    @PluginMethod
    public void setRecentsTheme(PluginCall call) {
        String theme = call.getString("theme", "light");
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.applyTheme(theme);
            call.resolve();
        } else {
            call.reject("Activity not available");
        }
    }
}

