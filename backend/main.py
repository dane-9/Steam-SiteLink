import Millennium
import os
import shutil
import base64

class Plugin:
    def __init__(self):
        self.injected_js_module_id = None
        self.injected_css_module_id = None
        self.plugin_root_dir = None
        try:
            path = os.path.abspath(__file__).replace('\\', '/')
            idx = path.lower().rfind('/backend')
            self.plugin_root_dir = path[:idx] if idx != -1 else None
            if not self.plugin_root_dir:
                print("[Plugin Backend] ERROR: Could not determine plugin root.")
        except Exception as e:
            print(f"[Plugin Backend] ERROR during path determination: {e}")

    def _load(self):
        # prepare and inject assets
        if not self.plugin_root_dir:
            return

        steamui = os.path.join(Millennium.steam_path(), 'steamui')
        rel_dir = os.path.join('plugins', 'steam-sitelink')
        dest = os.path.join(steamui, rel_dir)
        os.makedirs(dest, exist_ok=True)

        # JS paths
        src_js = os.path.join(self.plugin_root_dir, 'webkit', 'inject_sites.js')
        dst_js = os.path.join(dest, 'inject_sites.js')
        js_inject = os.path.join(rel_dir, 'inject_sites.js').replace('\\', '/')

        # CSS paths
        src_css = os.path.join(self.plugin_root_dir, 'styles', 'steam_sitelink.css')
        dst_css = os.path.join(dest, 'steam_sitelink.css')
        css_inject = os.path.join(rel_dir, 'steam_sitelink.css').replace('\\', '/')

        # encode icons
        icons = {}
        static_dir = os.path.join(self.plugin_root_dir, 'static')
        for name in ['steamrip.png', 'fitgirl.png', 'gog.png', 'anker.png', 'gamebounty.png', 'kaoskrew.png']:
            key = os.path.splitext(name)[0]
            path = os.path.join(static_dir, name)
            if os.path.exists(path):
                try:
                    with open(path, 'rb') as f:
                        icons[key] = f"data:image/png;base64,{base64.b64encode(f.read()).decode()}"
                except Exception as e:
                    print(f"[Plugin Backend] ERROR encoding {name}: {e}")
            else:
                print(f"[Plugin Backend] WARNING: Icon not found: {path}")
        if not icons:
            print("[Plugin Backend] WARNING: No icons encoded.")

        # prepend icon data and write JS
        try:
            with open(src_js, 'r', encoding='utf-8') as f:
                js_content = f.read()
        except Exception as e:
            print(f"[Plugin Backend] ERROR reading JS: {e}")
            return

        js_var = f"const injectedIconBase64Data = {icons};\n"
        try:
            with open(dst_js, 'w', encoding='utf-8') as f:
                f.write(js_var + js_content)
        except Exception as e:
            print(f"[Plugin Backend] ERROR writing JS: {e}")
            return

        # copy CSS
        try:
            shutil.copy2(src_css, dst_css)
        except Exception as e:
            print(f"[Plugin Backend] ERROR copying CSS: {e}")
            return

        # register with Millennium
        try:
            self.injected_js_module_id = Millennium.add_browser_js(js_inject)
        except Exception as e:
            print(f"[Plugin Backend] ERROR add_browser_js: {e}")
        try:
            self.injected_css_module_id = Millennium.add_browser_css(css_inject)
        except Exception as e:
            print(f"[Plugin Backend] ERROR add_browser_css: {e}")
        
        try:
            Millennium.ready()
            print("[Plugin Backend] Load routine finished successfully, signaled ready.")
        except Exception as e:
             print(f"[Plugin Backend] ERROR calling Millennium.ready(): {e}")

    def _unload(self):
        # remove injected modules and files
        if self.injected_js_module_id is not None:
            try:
                Millennium.remove_browser_module(self.injected_js_module_id)
            except Exception as e:
                print(f"[Plugin Backend] Error removing JS module: {e}")
        if self.injected_css_module_id is not None:
            try:
                Millennium.remove_browser_module(self.injected_css_module_id)
            except Exception as e:
                print(f"[Plugin Backend] Error removing CSS module: {e}")

        # delete files
        try:
            path = os.path.abspath(__file__).replace('\\', '/')
            idx = path.lower().rfind('/backend')
            root = path[:idx] if idx != -1 else None
        except Exception as e:
            print(f"[Plugin Backend] Failed to re-derive root: {e}")
            root = None

        if root:
            steamui = os.path.join(Millennium.steam_path(), 'steamui')
            dest = os.path.join(steamui, 'plugins', 'steam-sitelink')
            for fname in ['inject_sites.js', 'steam_sitelink.css']:
                file_path = os.path.join(dest, fname)
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    print(f"[Plugin Backend] ERROR removing {fname}: {e}")

    def _frontend_loaded(self):
        pass
