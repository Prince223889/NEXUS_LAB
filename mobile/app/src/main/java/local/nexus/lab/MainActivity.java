package local.nexus.lab;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
  private static final int PICK_FILE=42; private WebView web; private ProgressBar progress; private ValueCallback<Uri[]> fileCallback;
  private final Handler handler=new Handler(); private final ExecutorService io=Executors.newSingleThreadExecutor(); private TextView live; private EditText master;
  private JSONObject project;
  @Override public void onCreate(Bundle state){
    super.onCreate(state); getWindow().setStatusBarColor(Color.rgb(13,20,33)); getWindow().setNavigationBarColor(Color.rgb(13,20,33));
    try{project=new JSONObject(readAsset("project.json"));}catch(Exception ignored){project=null;}
    if(project!=null){projectApp();return;} webApp();
  }
  private String readAsset(String name)throws Exception{BufferedReader r=new BufferedReader(new InputStreamReader(getAssets().open(name),"UTF-8"));StringBuilder b=new StringBuilder();String l;while((l=r.readLine())!=null)b.append(l);r.close();return b.toString();}
  private void webApp(){
    FrameLayout root=new FrameLayout(this); web=new WebView(this); progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal); progress.setMax(100); root.addView(web,new FrameLayout.LayoutParams(-1,-1)); FrameLayout.LayoutParams p=new FrameLayout.LayoutParams(-1,dp(3),Gravity.TOP);root.addView(progress,p);setContentView(root);
    WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(true);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSupportMultipleWindows(false);web.setBackgroundColor(Color.rgb(16,22,33));
    web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return route(r.getUrl());}@Override public void onPageFinished(WebView v,String u){progress.setVisibility(View.GONE);}});
    web.setWebChromeClient(new WebChromeClient(){@Override public void onProgressChanged(WebView v,int n){progress.setProgress(n);progress.setVisibility(n>=100?View.GONE:View.VISIBLE);}@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;try{startActivityForResult(params.createIntent(),PICK_FILE);return true;}catch(Exception e){fileCallback=null;return false;}}});
    web.setDownloadListener((u,a,d,m,z)->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(u)));}catch(Exception ignored){}});loadMaster();
  }
  private JSONObject projectSpec; private LinearLayout projectBody; private String projectTab="blocks"; private String projectCode="";
  private void projectApp(){
    projectSpec=project.optJSONObject("spec"); if(projectSpec==null)projectSpec=project;
    try{projectCode=readAsset("project_code.ino");}catch(Exception ignored){projectCode="Le code ESP32 n’a pas été inclus dans ce paquet.";}
    ScrollView scroll=new ScrollView(this); LinearLayout root=new LinearLayout(this);root.setOrientation(1);root.setPadding(dp(22),dp(26),dp(22),dp(30));root.setBackgroundColor(Color.rgb(13,20,33));scroll.addView(root);setContentView(scroll);
    root.addView(text("NEXUS LAB  ·  STUDIO PROJET",12,Color.rgb(87,211,181)));
    root.addView(text(project.optString("title",projectSpec.optString("title","Mon projet")),29,Color.WHITE));
    root.addView(text(project.optString("description",project.optString("desc","Projet ESP32 généré depuis les blocs du Studio.")),15,Color.rgb(184,197,216)));
    root.addView(block("CIBLE  ·  "+boardLabel(project.optString("board",projectSpec.optString("board","esp32")))));
    root.addView(gap(12));root.addView(text("État du laboratoire",18,Color.WHITE));
    master=new EditText(this);master.setSingleLine(true);master.setHint("Adresse locale du MASTER");master.setText(getPreferences(0).getString("master_url","http://192.168.4.1"));master.setTextColor(Color.WHITE);master.setHintTextColor(Color.GRAY);master.setPadding(dp(14),dp(10),dp(14),dp(10));root.addView(master);
    LinearLayout row=new LinearLayout(this);row.setOrientation(0);Button connect=new Button(this);connect.setText("Enregistrer l’adresse");row.addView(connect,new LinearLayout.LayoutParams(0,-2,1));Button retry=new Button(this);retry.setText("Actualiser");row.addView(retry,new LinearLayout.LayoutParams(0,-2,1));root.addView(row);
    live=text("Connexion en attente…",14,Color.rgb(184,197,216));root.addView(live);
    connect.setOnClickListener(v->{String u=clean(master.getText().toString());if(valid(u)){getPreferences(0).edit().putString("master_url",u).apply();refresh();}else live.setText("Adresse locale invalide. Exemple : http://192.168.4.1");});
    retry.setOnClickListener(v->refresh());
    root.addView(gap(14));LinearLayout tabs=new LinearLayout(this);tabs.setOrientation(0);
    for(String[] tab:new String[][]{{"blocks","Blocs"},{ "wiring","Câblage"},{ "code","Code ESP32"}}){Button b=new Button(this);b.setText(tab[1]);b.setOnClickListener(v->{projectTab=tab[0];renderProjectTab();});tabs.addView(b,new LinearLayout.LayoutParams(0,-2,1));}root.addView(tabs);
    projectBody=new LinearLayout(this);projectBody.setOrientation(1);projectBody.setPadding(0,dp(12),0,0);root.addView(projectBody);renderProjectTab();
    root.addView(gap(18));root.addView(text("Le projet s’exécute sur la carte ESP32. Cette APK présente ses blocs, son câblage et son code, puis suit l’état réseau du MASTER.",12,Color.rgb(132,148,173)));
    refresh();handler.postDelayed(poll,5000);
  }
  private void renderProjectTab(){
    if(projectBody==null)return;projectBody.removeAllViews();
    if("blocks".equals(projectTab)){
      projectBody.addView(text("Composants du projet",19,Color.WHITE));JSONArray modules=projectSpec.optJSONArray("modules");
      if(modules==null||modules.length()==0)projectBody.addView(block("Aucun composant renseigné dans la fiche Studio."));
      else for(int i=0;i<modules.length();i++){Object raw=modules.opt(i);String id=raw instanceof JSONObject?((JSONObject)raw).optString("alias",((JSONObject)raw).optString("id","Composant")):String.valueOf(raw);projectBody.addView(block("MODULE  ·  "+id));}
      projectBody.addView(gap(12));projectBody.addView(text("Logique visuelle",19,Color.WHITE));JSONArray rules=projectSpec.optJSONArray("rules");
      if(rules==null||rules.length()==0)projectBody.addView(block("LECTURE  ·  mesures envoyées au moniteur ESP32; aucune règle SI / ALORS définie."));
      else for(int i=0;i<rules.length();i++){JSONObject r=rules.optJSONObject(i);if(r!=null){JSONObject cond=r.optJSONObject("if"),then=r.optJSONObject("then"),otherwise=r.optJSONObject("else");String condition=cond==null?"condition":moduleName(modules,cond.optInt("m",-1))+" · "+cond.optString("out","mesure")+" "+cond.optString("op","")+" "+cond.optString("v","");projectBody.addView(block("SI  ·  "+condition));if(then!=null)projectBody.addView(block("ALORS  ·  "+moduleName(modules,then.optInt("m",-1))+" → "+actionLabel(then)));if(otherwise!=null)projectBody.addView(block("SINON  ·  "+moduleName(modules,otherwise.optInt("m",-1))+" → "+actionLabel(otherwise)));}}
    }else if("wiring".equals(projectTab)){
      projectBody.addView(text("Connexions calculées par le Studio",19,Color.WHITE));int n=0;
      for(String line:projectCode.split("\\r?\\n")){String t=line.trim();if(t.startsWith("//")&&t.contains("->")){projectBody.addView(block(t.substring(2).trim()));n++;}}
      if(n==0)projectBody.addView(block("Aucune ligne de câblage intégrée. Ouvre le projet dans Studio → Montage pour voir le plan détaillé."));
      projectBody.addView(gap(8));projectBody.addView(text("Vérifie la référence exacte de la carte, la tension et le câblage avant toute alimentation.",12,Color.rgb(255,195,112)));
    }else{
      projectBody.addView(text("Code ESP32 généré",19,Color.WHITE));TextView code=text(projectCode,12,Color.rgb(195,211,236));code.setTypeface(android.graphics.Typeface.MONOSPACE);code.setTextIsSelectable(true);code.setPadding(dp(14),dp(14),dp(14),dp(14));code.setBackgroundColor(Color.rgb(22,31,44));projectBody.addView(code);
    }
  }
  private String moduleName(JSONArray modules,int index){if(modules==null||index<0||index>=modules.length())return "module";Object m=modules.opt(index);return m instanceof JSONObject?((JSONObject)m).optString("alias",((JSONObject)m).optString("id","module")):String.valueOf(m);}
  private String actionLabel(JSONObject a){String kind=a.optString("act","action");if("on".equals(kind))return "activer";if("off".equals(kind))return "arrêter";if("toggle".equals(kind))return "inverser";if("set".equals(kind))return "régler à "+a.optString("v","");return kind;}
  private String boardLabel(String id){if("esp32s3".equals(id))return "ESP32-S3";if("esp32c3".equals(id))return "ESP32-C3";return "ESP32";}
  private TextView block(String s){TextView t=text(s,14,Color.WHITE);t.setPadding(dp(14),dp(12),dp(14),dp(12));t.setBackgroundColor(Color.rgb(32,48,69));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(5),0,dp(5));t.setLayoutParams(p);return t;}
  private TextView text(String s,int size,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(5),0,dp(5));return t;}
  private View gap(int h){View v=new View(this);v.setLayoutParams(new LinearLayout.LayoutParams(1,dp(h)));return v;}
  private final Runnable poll=new Runnable(){public void run(){refresh();handler.postDelayed(this,5000);}};
  private void refresh(){if(live==null||master==null)return;String base=clean(master.getText().toString());if(!valid(base)){live.setText("Saisis l’adresse du MASTER S3.");return;}io.execute(()->{HttpURLConnection c=null;try{c=(HttpURLConnection)new URL(base+"/api/state").openConnection();c.setConnectTimeout(3500);c.setReadTimeout(3500);StringBuilder b=new StringBuilder();BufferedReader r=new BufferedReader(new InputStreamReader(c.getInputStream(),"UTF-8"));String l;while((l=r.readLine())!=null)b.append(l);JSONObject data=new JSONObject(b.toString());JSONArray workers=data.optJSONArray("workers");String status="MASTER joignable · "+(workers==null?"état reçu":workers.length()+" worker(s)");runOnUiThread(()->live.setText(status));}catch(Exception e){runOnUiThread(()->live.setText("MASTER injoignable. Vérifie Wi‑Fi et adresse. L’application reste disponible hors ligne."));}finally{if(c!=null)c.disconnect();}});}
  private boolean route(Uri u){if("nexus".equals(u.getScheme())&&"connect".equals(u.getHost())){String value=u.getQueryParameter("url");if(valid(value)){getPreferences(0).edit().putString("master_url",clean(value)).apply();web.post(this::loadMaster);}return true;}if("http".equals(u.getScheme())||"https".equals(u.getScheme())){String h=u.getHost()==null?"":u.getHost().toLowerCase();if(h.equals("192.168.4.1")||h.endsWith(".local")||h.startsWith("192.168.")||h.startsWith("10.")||h.equals("localhost"))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}return false;}
  private void loadMaster(){String u=getPreferences(0).getString("master_url","http://192.168.4.1");if(valid(u))web.loadUrl(clean(u));else web.loadUrl("file:///android_asset/landing.html");}
  private boolean valid(String v){if(v==null)return false;Uri u=Uri.parse(v.trim());return("http".equals(u.getScheme())||"https".equals(u.getScheme()))&&u.getHost()!=null&&u.getUserInfo()==null;}
  private String clean(String v){String x=v.trim();while(x.endsWith("/"))x=x.substring(0,x.length()-1);return x;}
  @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==PICK_FILE&&fileCallback!=null){fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));fileCallback=null;}}
  @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
  private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
  @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);io.shutdownNow();if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
