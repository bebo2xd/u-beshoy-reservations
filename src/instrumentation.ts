export async function register() {
  // Keep Node date helpers aligned with church timezone when possible.
  process.env.TZ = "Africa/Cairo";
}
