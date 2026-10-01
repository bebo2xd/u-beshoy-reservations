package xd.church.reservations.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  public static final String BOOKING_CHANNEL_ID = "booking_alerts";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    createBookingNotificationChannel();
    super.onCreate(savedInstanceState);
  }

  private void createBookingNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationChannel channel =
        new NotificationChannel(
            BOOKING_CHANNEL_ID,
            "تنبيهات الحجز",
            NotificationManager.IMPORTANCE_HIGH);
    channel.setDescription("إشعارات طلبات الحجز والموافقة والرفض");
    channel.enableVibration(true);
    channel.enableLights(true);
    channel.setShowBadge(true);

    AudioAttributes audioAttributes =
        new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
    Uri sound = Settings.System.DEFAULT_NOTIFICATION_URI;
    channel.setSound(sound, audioAttributes);

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager != null) {
      manager.createNotificationChannel(channel);
    }
  }
}
