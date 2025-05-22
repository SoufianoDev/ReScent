package com.soufianodev.rescent.model

import java.time.LocalDateTime
import java.nio.file.Path

/**
 * Data class representing a release of the browser extension.
 *
 * @property version The semantic version of the release (e.g., "1.0.0")
 * @property releaseTime The timestamp when the release was created
 * @property files Map of browser types to their respective extension file paths
 * @property buildPath The path where the release was built
 */
data class ExtensionRelease(
    @JvmField
    val version: ExtensionVersion,
    @JvmField
    val releaseTime: LocalDateTime,
    @JvmField
    val files: Map<BrowserType, Path>,
    @JvmField
    val buildPath: Path
) {
    /**
     * Returns the formatted release directory name.
     */
    fun getReleaseDirName(): String = "v${version.toString()}"
}
