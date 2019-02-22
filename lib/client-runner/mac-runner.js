'use babel';

import BaseRunner from './base-runner';

export default class MacRunner extends BaseRunner {
    javaBinary() {
        return 'java';
    }

    javaPath() {
        return 'Contents/Home/bin'
    }

    jdkUrl() {
        return 'https://download.java.net/java/GA/jdk11/9/GPL/openjdk-11.0.2_osx-x64_bin.tar.gz';
    }

    jdkVersion() {
        return 'jdk-11.0.2.jdk';
    }
}
