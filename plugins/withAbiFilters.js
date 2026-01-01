const { withAppBuildGradle } = require('expo/config-plugins');

const withAbiFilters = (config) => {
    return withAppBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            config.modResults.contents = modifyBuildGradle(config.modResults.contents);
        } else {
            throw new Error('Cannot modify build.gradle because it is not groovy');
        }
        return config;
    });
};

function modifyBuildGradle(buildGradle) {
    // Only use splits configuration for separate APKs per architecture
    // Do NOT use ndk abiFilters as it conflicts with splits
    if (!buildGradle.includes('splits {')) {
        const splitsPattern = /android\s?{/;
        const splitsReplacement = `android {
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a"
            universalApk false
        }
    }`;
        buildGradle = buildGradle.replace(splitsPattern, splitsReplacement);
    }

    return buildGradle;
}

module.exports = withAbiFilters;
