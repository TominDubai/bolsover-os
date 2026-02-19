const TerminalApp = (() => {
    const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;

    function launch() {
        const html = `
            <div class="terminal">
                <div class="terminal-output"></div>
                <div class="terminal-input-line">
                    <span class="terminal-prompt">user@bolsover:~$</span>
                    <input class="terminal-input" type="text" autofocus spellcheck="false">
                </div>
            </div>
        `;

        WindowManager.createWindow('terminal', 'Terminal', html, {
            width: 680, height: 420,
            onReady: (win) => {
                const output = win.querySelector('.terminal-output');
                const input = win.querySelector('.terminal-input');
                const prompt = win.querySelector('.terminal-prompt');
                let cwd = '/home/user';

                output.textContent = 'Bolsover OS Terminal v1.0\nType "help" for available commands.\n\n';

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        const cmd = input.value.trim();
                        output.textContent += `${prompt.textContent} ${cmd}\n`;
                        if (cmd) processCommand(cmd, output, { cwd, setCwd: (p) => { cwd = p; prompt.textContent = `user@bolsover:${cwd === '/home/user' ? '~' : cwd}$`; }});
                        input.value = '';
                        output.scrollTop = output.scrollHeight;
                    }
                });

                input.focus();
                win.querySelector('.terminal').addEventListener('click', () => input.focus());
            }
        });
    }

    function processCommand(cmd, output, ctx) {
        const parts = cmd.split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);
        const fs = VirtualFS;

        const commands = {
            help: () => `Available commands:
  help          Show this help
  ls [path]     List directory contents
  cd <path>     Change directory
  pwd           Print working directory
  mkdir <name>  Create directory
  touch <name>  Create empty file
  cat <file>    Show file contents
  echo <text>   Print text
  rm <path>     Remove file or directory
  clear         Clear terminal
  date          Show current date
  whoami        Show current user
  uname         Show system info
  neofetch      System information`,

            ls: () => {
                const path = args[0] ? resolvePath(args[0], ctx.cwd) : ctx.cwd;
                const node = fs.getNode(path);
                if (!node || node.type !== 'dir') return `ls: cannot access '${path}': No such directory`;
                const entries = Object.keys(node.children);
                if (entries.length === 0) return '';
                return entries.map(name => {
                    const child = node.children[name];
                    return child.type === 'dir' ? `\x1b[1m${name}/\x1b[0m` : name;
                }).join('  ');
            },

            cd: () => {
                if (!args[0] || args[0] === '~') { ctx.setCwd('/home/user'); return ''; }
                const target = resolvePath(args[0], ctx.cwd);
                const node = fs.getNode(target);
                if (!node || node.type !== 'dir') return `cd: no such directory: ${args[0]}`;
                ctx.setCwd(target);
                return '';
            },

            pwd: () => ctx.cwd,

            mkdir: () => {
                if (!args[0]) return 'mkdir: missing operand';
                const path = resolvePath(args[0], ctx.cwd);
                return fs.mkdir(path) ? '' : `mkdir: cannot create directory '${args[0]}'`;
            },

            touch: () => {
                if (!args[0]) return 'touch: missing operand';
                const path = resolvePath(args[0], ctx.cwd);
                return fs.writeFile(path, '') ? '' : `touch: cannot create '${args[0]}'`;
            },

            cat: () => {
                if (!args[0]) return 'cat: missing operand';
                const path = resolvePath(args[0], ctx.cwd);
                const content = fs.readFile(path);
                return content !== null ? content : `cat: ${args[0]}: No such file`;
            },

            echo: () => args.join(' '),

            rm: () => {
                if (!args[0]) return 'rm: missing operand';
                const path = resolvePath(args[0], ctx.cwd);
                return fs.remove(path) ? '' : `rm: cannot remove '${args[0]}'`;
            },

            clear: () => { output.textContent = ''; return ''; },

            date: () => new Date().toString(),
            whoami: () => 'user',
            uname: () => 'BolsoverOS 1.0 (Web/JS)',

            neofetch: () => `
       ██████████       user@bolsover
     ██          ██     ──────────────
   ██   ▄▄▄▄▄▄   ██    OS: Bolsover OS 1.0
  ██   ██    ██   ██    Host: Web Browser
  ██   ██████▀▀   ██    Kernel: JavaScript
  ██   ██    ██   ██    Shell: BolsoverTerm
   ██   ▀▀▀▀▀▀   ██    Resolution: ${window.innerWidth}x${window.innerHeight}
     ██          ██     Theme: Dark
       ██████████       Memory: ${Math.round(performance?.memory?.usedJSHeapSize / 1048576 || 0)} MB
`,
        };

        const fn = commands[command];
        if (fn) {
            const result = fn();
            if (result) output.textContent += result + '\n';
        } else {
            output.textContent += `${command}: command not found\n`;
        }
    }

    function resolvePath(input, cwd) {
        if (input === '~') return '/home/user';
        if (input.startsWith('~/')) input = '/home/user/' + input.slice(2);
        if (!input.startsWith('/')) input = cwd + '/' + input;
        // Normalize
        const parts = input.split('/').filter(Boolean);
        const resolved = [];
        for (const p of parts) {
            if (p === '..') resolved.pop();
            else if (p !== '.') resolved.push(p);
        }
        return '/' + resolved.join('/');
    }

    return { id: 'terminal', name: 'Terminal', icon: ICON, launch };
})();
