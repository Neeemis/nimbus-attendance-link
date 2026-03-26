export async function getSyncedTime() {
  try {
    // Attempting to get high-accuracy time from WorldTimeAPI (Asia/Kolkata)
    const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', { 
      next: { revalidate: 0 }, // Do not cache
      signal: AbortSignal.timeout(1500) // Fast timeout 1.5s
    });
    if (response.ok) {
      const data = await response.json();
      return new Date(data.datetime);
    }
  } catch (err) {
    console.warn('WorldTimeAPI failed, falling back to System Time');
  }
  // Fallback to local server time
  return new Date();
}
