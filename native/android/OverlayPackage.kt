package com.pedrodarrigo.x5_DoctaControl

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class OverlayPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    if (name == OverlayModule.NAME) return OverlayModule(reactContext)
    return null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        OverlayModule.NAME to ReactModuleInfo(
          OverlayModule.NAME,
          OverlayModule::class.java.name,
          false,
          false,
          false,
          false,
        ),
      )
    }
  }
}
