# CocoaPods spec for the local StudyTimerActivity Expo module (native bridge layer).
# Expo autolinking picks this up from modules/study-timer-activity. iOS only: ActivityKit does not
# exist on tvOS, and 16.4 matches the Expo SDK's minimum iOS version.
Pod::Spec.new do |s|
  s.name           = 'StudyTimerActivity'
  s.version        = '1.0.0'
  s.summary        = 'Bridges the study timer to ActivityKit Live Activities.'
  s.description    = 'Starts, updates, ends and lists the study timer Live Activity from JavaScript.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
