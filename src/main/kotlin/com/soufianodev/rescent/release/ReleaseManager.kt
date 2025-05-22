package com.soufianodev.rescent.release

import com.soufianodev.rescent.model.BrowserType
import com.soufianodev.rescent.model.ExtensionRelease
import com.soufianodev.rescent.model.ExtensionVersion
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.time.LocalDateTime

/**
 * Manages the release process for browser extensions.
 */
class ReleaseManager(private val releasesDir: Path) {

    fun createRelease(
        version: String,
        buildPath: Path,
        extensionFiles: Map<BrowserType, Path>
    ): ExtensionRelease {
        val extensionVersion = ExtensionVersion.fromString(version.trim())
        val release = ExtensionRelease(
            version = extensionVersion,
            releaseTime = LocalDateTime.now(),
            files = extensionFiles,
            buildPath = buildPath
        )

        // Create release directory
        val releaseDir = releasesDir.resolve(release.getReleaseDirName())
        Files.createDirectories(releaseDir)

        // Create browser-specific directories and copy files
        extensionFiles.forEach { (browserType, path) ->
            val browserDir = releaseDir.resolve(browserType.name.lowercase())
            Files.createDirectories(browserDir)

            val fileName = path.fileName.toString()
            val versionedFileName = fileName.replace(
                ".(crx|xpi)$".toRegex(),
                "_v${extensionVersion}.$1"
            )
            val targetPath = browserDir.resolve(versionedFileName)
            Files.copy(path, targetPath, StandardCopyOption.REPLACE_EXISTING)
        }

        return release
    }

    companion object {
        const val RELEASES_FOLDER = "releases"
    }
}
