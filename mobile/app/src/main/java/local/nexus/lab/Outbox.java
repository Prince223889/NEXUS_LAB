package local.nexus.lab;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Boîte d'envoi du mode téléphone : travail fait sans le box (projets, notes, applications), envoyé au box à la
 * prochaine connexion. Fichier privé de l'application chiffré en AES-256-GCM ; la clé est créée dans le Keystore
 * Android et n'en sort jamais (ni sauvegarde, ni autre application, ni copie du fichier sur un autre téléphone).
 * Format : "NXO1" + IV (12 octets) + texte chiffré avec étiquette GCM (128 bits).
 */
final class Outbox {
  private static final String ALIAS = "nexus-outbox";
  private static final byte[] MAGIC = {'N', 'X', 'O', '1'};
  private static final int MAX_ITEMS = 500;
  private final File file;

  Outbox(Context ctx) { file = new File(ctx.getFilesDir(), "outbox.bin"); }

  private static SecretKey key() throws Exception {
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
    ks.load(null);
    if (ks.containsAlias(ALIAS)) return ((KeyStore.SecretKeyEntry) ks.getEntry(ALIAS, null)).getSecretKey();
    KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
    g.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build());
    return g.generateKey();
  }

  synchronized JSONArray list() {
    try {
      if (!file.exists()) return new JSONArray();
      byte[] all = read(file);
      if (all.length < 4 + 12 + 16 || all[0] != MAGIC[0] || all[1] != MAGIC[1] || all[2] != MAGIC[2] || all[3] != MAGIC[3]) return new JSONArray();
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, all, 4, 12));
      byte[] plain = c.doFinal(all, 16, all.length - 16);
      return new JSONArray(new String(plain, StandardCharsets.UTF_8));
    } catch (Exception e) {
      return new JSONArray(); // fichier altéré ou clé perdue : on ne lit rien plutôt que des données non authentifiées
    }
  }

  synchronized String add(JSONObject item) throws Exception {
    JSONArray items = list();
    if (items.length() >= MAX_ITEMS) throw new IllegalStateException("Boîte d'envoi pleine");
    String id = "tel-" + UUID.randomUUID().toString().substring(0, 13);
    item.put("id", id);
    items.put(item);
    save(items);
    return id;
  }

  synchronized void remove(JSONArray ids) throws Exception {
    JSONArray items = list(), keep = new JSONArray();
    for (int i = 0; i < items.length(); i++) {
      JSONObject x = items.optJSONObject(i);
      boolean drop = false;
      for (int j = 0; x != null && j < ids.length(); j++) if (x.optString("id").equals(ids.optString(j))) drop = true;
      if (x != null && !drop) keep.put(x);
    }
    save(keep);
  }

  private void save(JSONArray items) throws Exception {
    Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
    c.init(Cipher.ENCRYPT_MODE, key()); // IV aléatoire choisi par le Keystore
    byte[] iv = c.getIV();
    byte[] enc = c.doFinal(items.toString().getBytes(StandardCharsets.UTF_8));
    File tmp = new File(file.getPath() + ".tmp");
    try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(MAGIC); o.write(iv); o.write(enc); o.getFD().sync(); }
    if (!tmp.renameTo(file)) throw new IllegalStateException("Écriture de la boîte d'envoi impossible");
  }

  private static byte[] read(File f) throws Exception {
    try (FileInputStream in = new FileInputStream(f)) {
      ByteArrayOutputStream b = new ByteArrayOutputStream();
      byte[] buf = new byte[8192];
      int n;
      while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
      return b.toByteArray();
    }
  }
}
