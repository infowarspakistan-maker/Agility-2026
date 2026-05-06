export async function sendEmailNotification(email: string, subject: string, message: string) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, subject, message }),
    });
    return await response.json();
  } catch (error) {
    console.error('Notification error:', error);
    return { success: false, error };
  }
}
