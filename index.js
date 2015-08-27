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
		.option('-v, --version', 'specify publish version', String)
	commander.action(function() {

		var args = Array.prototype.slice.call(arguments);
		var options = args.pop();
		var cmd = args.shift();
		if(options.version){
			pushVersion(options.version);
		}else{
			gitPushTag();
		}
	});
}

//获取component.json
function get_conf() {
	var root = fis.util.realpath(process.cwd()),
		filename = "component.json",
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

function pushVersion(version) {
	var configPath = get_conf();
	if (!/^\d[0-9\.]+\d$/.test(version)) {
		fis.log.error('unusable version:' + version);
		return;
	}
	if (configPath === false) {
		console.log('must enter component root path');
		return false;
	}
	var componentJSON = JSON.parse(fis.util.read(configPath));
	//没有修改
	if (componentJSON.version === version) {
		return gitPushTag(version);
	}
	componentJSON.version = version;
	fis.util.write(configPath, JSON.stringify(componentJSON));
	var status = 'git status';
	exeCmd(status, function(stdout) {
		if (stdout.indexOf('nothing to commit, working directory clean') > 0) {
			next();
		} else {
			print_faq();
		}
	});

	function next() {
		exeCmd(
			'git commit -am \'update new tag ' + version + ' use [didi publish] \' && git push origin master',
			function(stdout) {
				if (stdout.indexOf('reused 0') > 0) {
					gitPushTag(version);
				}
			})
	}
}

function gitPushTag(version) {
	var configPath = get_conf();
	if (configPath === false) {
		console.log('must enter component root path');
		return false;
	}
	version = version || JSON.parse(fis.util.read(configPath)).version;

	var cmd = 'git tag -a {-version-} -m \'create tag v{-version-} use didi publish\' && git push origin --tags';
	var data = {
		version: version
	}
	cmd = cmd.replace(/\{\-([^\-]+)\-\}/g, function(code, key) {
		return data[key.trim()] || '';
	});
	var status = 'git status';
	exeCmd(status, function(stdout) {
		if (stdout.indexOf('nothing to commit, working directory clean') > 0) {
			next();
		} else {
			print_faq();
		}
	});

	function next() {
		exeCmd(cmd, function(stdout) {
			if (stdout.indexOf('* [new tag]') > 0) {
				fis.log.notice('Successful');
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
		debugger;
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