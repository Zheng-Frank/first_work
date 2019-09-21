/**
 * A center place for defining errors
 */

export enum KnownError {
    TASK_NO_MATCHING_RESTAURANT = 'no matching restaurant found',
    TASK_FAILED_TO_ASSIGN_ACCOUNT = 'failed to choose a valid account',
    GMB_NO_AUTO_POPULATION = 'NO AUTO POPULATION',
    GMB_INVALID_REQUEST = 'Your request is no longer valid',
    GMB_APPEAL_WITHOUT_REQUEST_FOUND = 'no request found to appeal (bad request, should start over)',
    GMB_WAITING_FOR_APPEAL = 'wait for appeal-link',
    GMB_UNHANDLED_APPEAL_CASE = 'unhandled case of in checking verifiable',
    GMB_MISSING_APPEAL_ID = 'NO APPEAL ID FOUND! NOT VERIFIABLE',
    GMB_UI_NOT_VERIFIABLE = 'UI NOT VERIFIABLE.',
    GMB_PIN_ALREADY_HANDLED = 'PIN ALREADY HANDLED',
    GMB_PUBLISHED_UNDER_OTHER_ACCOUNT = 'published under other accounts',
    GMB_PIN_MISMATCH = 'pin and verification method mismatch',
    GMB_UNHANDLED_VERIFICATION_CASE = 'unhandled verification case',
    GMB_SHOULD_USE_PHONE_CALL_TO_VERIFICATION = 'SHOULD USE PHONE_CALL TO VERIFY',
    GMB_FAILED_NORMAL_ACCESS_REQUEST = 'invalid normal access error',
    GMB_FAILED_API_VERIFICATION = 'The location cannot be verified. It is either already verified or in an unverifiable state'

}