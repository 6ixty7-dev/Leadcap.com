import { FeatureFlags, ModuleStatus, logStartupError } from '../config/feature-flags';

/**
 * Lead Intelligence OS — Safe Module Loader
 * Wraps module initialization in try-catch to prevent startup crashes.
 */
export async function safeLoad<T>(
  moduleName: keyof typeof ModuleStatus,
  initFn: () => Promise<T> | T,
  options: { 
    required?: boolean; 
    featureFlag?: keyof typeof FeatureFlags;
    fallback?: T;
  } = {}
): Promise<T | undefined> {
  const { required = false, featureFlag, fallback } = options;

  // Check feature flag if provided
  if (featureFlag && !FeatureFlags[featureFlag]) {
    console.log(`\x1b[33m[BOOT] ${moduleName} disabled by feature flag.\x1b[0m`);
    ModuleStatus[moduleName] = 'disabled';
    return fallback;
  }

  try {
    const result = await initFn();
    ModuleStatus[moduleName] = 'active';
    console.log(`\x1b[32m[BOOT] ${moduleName} initialized successfully.\x1b[0m`);
    return result;
  } catch (error) {
    ModuleStatus[moduleName] = 'failed';
    logStartupError(moduleName, error);

    if (required) {
      console.error(`\x1b[41m[CRITICAL] ${moduleName} is required but failed. Process may be unstable.\x1b[0m`);
    } else {
      console.warn(`\x1b[33m[BOOT] ${moduleName} failed, but server will continue (isolated failure).\x1b[0m`);
    }

    return fallback;
  }
}
