
# Atrix

## Project

Atrix is a project that allows people to create [Matrix](https://spec.matrix.org/latest/) rooms
that can be configured to only accept specific [AT Protocol](https://atproto.com/)
[lexica](https://atproto.com/guides/lexicon).

## Project Definition

This is a NodeJS website with the following characteristics:

- It is a web app that is a form of chat client built atop [element-web](https://github.com/element-hq/element-web).
- Users are able to login using their ATProto/Bluesky identity using OAuth. That identity is then used as an
  identity provider for the same user to log into a Matrix homeroom. If they already have a Matrix account they
  can link it with the ATProto identity; if they don't it is created for them and then linked too.
- Once logged in, users can either join existing rooms (that are open to them) or create their own.
- When creating a room, it is possible to specify that it will be restricted to an ATProto lexicon
  NSID prefix (so for instance, restricted to all definitions under the `app.bsky.*` NSID prefix).
- When reading messages in a room that supports a specific lexicon or set thereof, they are rendered
  using the typical rendering of such components in apps that use the lexicon. Similarly, when posting
  the editing UI matches what you would get in an app for that lexicon. So, to give an example, 
  reading `app.bsky.*` messages will look like Bluesky posts, including folding in events for likes 
  and the such from the Matrix room. Liking one such post will send the corresponding `app.bsky.*`
  message for like to the room.
- A room that supports ATProto lexica may or may not support native `m.*` Matrix messages.
