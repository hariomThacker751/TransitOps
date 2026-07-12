/**
 * Mock-layer dispatch validation — delegates to the shared utility.
 * The shared utility (utils/dispatchRules.js) mirrors the backend's
 * tripRulesEngine.js and is used by both mock and real modes.
 */
export { validateDispatch } from '@/utils/dispatchRules'