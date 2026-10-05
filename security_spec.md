# Security Specification & Test Matrix for ToolStacker

## 1. Data Invariants
1. `UserProfile` can only be read and written by the authenticated user whose `request.auth.uid` matches the `userId` in the document path (`/users/{userId}`).
2. In `UserProfile`, users cannot forge email or write another user's profile.
3. `SavedItem` must reside inside `/users/{userId}/savedItems/{itemId}` where `userId == request.auth.uid`.
4. In `SavedItem`, `incoming().userId` must strictly equal `request.auth.uid`.
5. An unauthenticated guest user cannot read or write any user profiles or saved items in the database.
6. The test connection document `/test/connection` can be read by any client for system diagnostic purposes.
7. Catch-all: Any undefined collection or path is strictly denied.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read**: Attempting to read `/users/user123` without credentials -> PERMISSION_DENIED.
2. **Cross-User Profile Read**: User `victim` reads `/users/target` -> PERMISSION_DENIED.
3. **Cross-User Profile Write**: User `attacker` attempts `setDoc(/users/target)` -> PERMISSION_DENIED.
4. **UID Spoof in SavedItem**: User `user1` writes to `/users/user1/savedItems/item1` with payload `{ userId: 'user2' }` -> PERMISSION_DENIED.
5. **Path Escaping / Poisoning**: Document ID with invalid characters or excessive length (>128 chars) -> PERMISSION_DENIED.
6. **Shadow Fields**: Injecting unauthorized ghost fields (e.g., `{ isAdmin: true }`) into UserProfile -> PERMISSION_DENIED.
7. **Cross-User Subcollection List**: User `user1` attempts to list `/users/user2/savedItems` -> PERMISSION_DENIED.
8. **Negative / Invalid Work Type**: Submitting `{ type: 'malicious_exec' }` instead of enum values -> PERMISSION_DENIED.
9. **Oversized Content Payload Denial-of-Wallet**: Writing payload with `content` string exceeding 500,000 characters -> PERMISSION_DENIED.
10. **Immutable Field Tampering**: Updating an existing `SavedItem` to change its `id`, `userId`, or `createdAt` -> PERMISSION_DENIED.
11. **Unverified Email Privilege Escalation**: User without verified email attempting write access -> PERMISSION_DENIED.
12. **Blind Collection Query**: Unauthenticated query trying to dump all documents across users -> PERMISSION_DENIED.
