# component模块发布

[fis-didi](https://github.com/webzhangnan/fis-didi)可以直接通过`didi install <namespace>/<comonent name>`命令安装一个模块。
 然后在项目里面通过`require("<component name"")`来获取该模块。

## so

component模块可以通过`didi publish`来发布新版本。

## 安装 fis-didi

```
npm i fis-didi -g
```

## 使用

进入`component`模块根目录

```bash
cd <comonent_root>
```

- 发布一个指定新版本`1.0.0`

```bash
didi publish -t 1.0.0
```

- 以`<comonent_root>/component.json`
里`version`字段值为版本号发布。

```bash
didi publish 
```

须保证新版本号不会发生冲突，即不在**已发布版本列表**内，可以通过`git tag`来查看。

以上2种发布前都必须保证

- 项目已经将修改提交(`git commit`)，并且推送(`git push`)到远程仓库。
- 当前处于`master`分支。
- 远程仓库包含`origin`(使用`git remote -v`查看)。通过`git clone`下来的仓库默认就是将远端地址设置为`origin`。


**发布阶段，程序将会检查`component.json`是否符合规范，保证其他开发者可以正常安装**。



