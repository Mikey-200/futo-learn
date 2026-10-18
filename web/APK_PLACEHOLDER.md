# APK Placement

Place your built APK here and name it exactly:

```
web/futo-learn.apk
```

**How to build the release APK:**

```bash
cd android
./gradlew assembleRelease
```

The output will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

Copy it here as `futo-learn.apk`. The landing page download button already points to this file.

> The APK is excluded from git (it's a large binary). Upload it manually to Vercel or use an external storage link — see the deployment guide.
