# egg-vscode

1. 修改index.js的11行的my-vscode-dev为你的隧道名字
tunnelName: process.env.TUNNEL_NAME || 'my-vscode-dev'

2.把3个文件放到 文件管理 里面的根目录下，它的绝对路径是 /home/container/

3.在 启动 菜单 里的最底下的 Main file 里面填写index.js, 这是启动的入口文件。

4. 点击上面的启动按钮，静待完成，在 控制台 里面会输出日志，看到它显示 XXXX-XXXX样式的验证码，就按照日志提示的网址 github.com/login/devic e登录github输入验证码，然后隧道就建立完成。
  
5. 日志会输出你的隧道地址， https://vscode.dev/tunnel/你的隧道名字， 按照就能进入你的云vscode ide了。

6. 在终端执行 chmod +x /home/container/init.sh && /home/container/init.sh， 会安装go和别名Python。有默认了一个codespaces的文件夹用来写代码，打开这个文件夹就是美化过的终端，目录是/home/container/codespaces



