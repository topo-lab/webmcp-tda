// Paths of the machine that built an artifact. Emscripten's own virtual file system (/home/web_user, /tmp) and
// the /emsdk prefix of its prebuilt system libraries are not local paths, so they are not matched.
export const LOCAL_PATH = /\/Users\/[^/\s"'`]+|\/private\/(?:tmp|var)\/|\/home\/(?!web_user\b)[^/\s"'`]+\/|[A-Za-z]:\\Users\\/;

/** The first local path in `bytes`, or null. Binary files are read as Latin-1 so every byte maps to one character. */
export function findLocalPath(bytes) {
  const match = LOCAL_PATH.exec(Buffer.from(bytes).toString('latin1'));
  return match ? match[0] : null;
}
