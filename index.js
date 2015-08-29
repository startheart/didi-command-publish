'use strict';

var child_process = require('child_process');
var path = require('path');

exports.name = 'publish';
exports.usage = '[options]';
exports.desc = 'A awesome publish for component of fis-didi';
exports.register = function(commander) {
	commander.on('--help', function() {
		console.log('Publishes \'.\' ');
	});
	commander
		.option('-t, --tag <name>', 'specify publish tag', String)
	commander.action(function() {

		var args = Array.prototype.slice.call(arguments);
		var options = args.pop();
		var cmd = args.shift();
		if (options.tag) {
			pushVersion(options.tag);
		} else {
			gitPushTag();
		}
	});
}

//获取component.json
function get_conf(root) {
	root = root || fis.util.realpath(process.cwd());
	var filename = "component.json",
		conf;

	var cwd = root,
		pos = cwd.length;
	do {
		cwd = cwd.substring(0, pos);
		conf = cwd + '/' + filename;
		if (fis.util.exists(conf)) {
			root = cwd;
			break;
		} else {
			conf = false;
			pos = cwd.lastIndexOf('/');
		}
	} while (pos > 0);

	return conf;
}

function cd(dir) {
	return 'cd ' + dir + ' && ';
}

function isStatusClean(stdout) {
	var cleanModel = ["On branch master", "Your branch is up-to-date with 'origin/master'.", "nothing to commit, working directory clean"];
	stdout = stdout.trim().split(/\n|\r/);
	if ( stdout[0].toLowerCase().trim() !== cleanModel[0].toLowerCase().trim()
		&&  stdout[stdout.length -1].toLowerCase().trim() !== cleanModel[cleanModel.length - 1].toLowerCase().trim()
		) {
		return false;
	}
	return true;
}

function isPushTagSuccess(stdout) {
	return stdout.indexOf('* [new tag]') > 0;
}
function isPushRemoteSuccess(stdout){
	stdout = stdout.split(/\n|\r/);
	var reg = /\[master [^\]]+\] update new tag [0-9\.]+ use \[didi publish\]/;
	return stdout[0].match(reg);
}
function pushVersion(version, repositoryRoot, callback) {
	repositoryRoot = repositoryRoot || process.cwd();
	var configPath = get_conf(repositoryRoot);
	debugger;
	version = (version || '').trim();
	var cmdStatus = 'git status';
	var cmdCommitAndPushOrigin = 'git commit -am \'update new tag ' + version + ' use [didi publish] \' && git push origin master';
	cmdCommitAndPushOrigin = cd(repositoryRoot) + cmdCommitAndPushOrigin;
	cmdStatus = cd(repositoryRoot) + cmdStatus;

	if (fis.util.exists(repositoryRoot) === false) {
		fis.log.error('Unusable repository root:' + repositoryRoot);
		return
	}

	if (!/^\d[0-9\.]+\d$/.test(version)) {
		fis.log.error('unusable version:' + version);
		return;
	}
	if (configPath === false) {
		console.log('Must enter component root path');
		return false;
	}
	var componentJSON = JSON.parse(fis.util.read(configPath));
	//没有修改
	if (componentJSON.version === version) {
		return gitPushTag(version);
	}
	componentJSON.version = version;
	exeCmd(cmdStatus, function(stdout) {
		if (isStatusClean(stdout)) {
			next();
		} else {
			callback(stdout);
			print_faq();
		}
	});

	function next() {
		fis.util.write(configPath, JSON.stringify(componentJSON, null, '\t'));
		exeCmd(
				cmdCommitAndPushOrigin,
				function(stdout) {
					if ( isPushRemoteSuccess(stdout) ) {
						gitPushTag(version, repositoryRoot, callback);
					}else{
						fis.log.error('push failed \n' + stdout);
					}
				}
			)
	}
}

function gitPushTag(version, repositoryRoot, callback) {
	callback = callback || function() {};
	repositoryRoot = repositoryRoot || process.cwd();
	var configPath = get_conf(repositoryRoot);
	version = version || JSON.parse(fis.util.read(configPath)).version;
	version = version.trim();
	if (configPath === false) {
		console.log('must enter component root path');
		return false;
	}
	var cmdAddVersion = 'git tag -a {-version-} -m \'create tag v{-version-} use didi publish\' && git push origin --tags';
	var cmdStatus = 'git status';
	cmdAddVersion = cd(repositoryRoot) + cmdAddVersion;
	cmdStatus = cd(repositoryRoot) + cmdStatus;

	if (fis.util.exists(repositoryRoot) === false) {
		fis.log.error('Unusable repository root:' + repositoryRoot);
		return
	}

	var data = {
		version: version
	}
	cmdAddVersion = cmdAddVersion.replace(/\{\-([^\-]+)\-\}/g, function(code, key) {
		return data[key.trim()] || '';
	});
	exeCmd(cmdStatus, function(stdout) {
		if (isStatusClean(stdout)) {
			next();
		} else {
			callback(stdout);
			print_faq();
		}
	});

	function next() {
		exeCmd(cmdAddVersion, function(stdout) {
			if (isPushTagSuccess(stdout)) {
				fis.log.notice('Successful');
				callback();
			}else{
				fis.log.error('failed' + stdout);
				callback(stdout);
				print_faq();
			}
		})
	}

}

function exeCmd(cmd, cb) {
	cb = cb || function() {};
	var finishData = ['-', '-'];
	var git = child_process.exec(cmd, function(err, stdout, stderr) {
		if (err) {
			return print_faq();
		}
		finishData[0] = stdout || stderr;
		fnish();
	});
	git.stdout.pipe(process.stdout);
	git.stderr.pipe(process.stderr);

	git.on('exit', function(code) {
		finishData[1] = code
		fnish();
	});

	function fnish() {
		if (finishData[0] === '-' || finishData[0] === '-') {
			return;
		}
		if (finishData[1] === 1) {
			print_faq();
		} else {
			cb(finishData[0]);
		}
	}
}


function print_faq() {
	var faqList = [
		'\n\n发布失败，请确认：',
		'1、component项目文件夹内执行',
		'2、所有修改都已经push到远程仓库(git status)',
		'3、与如下已发布版本的号不同(component.json)'
	];
	exeCmd('git tag');
	console.log(faqList.join('\n'));
}


exports.gitPushTag = gitPushTag;
exports.pushVersion = pushVersion;