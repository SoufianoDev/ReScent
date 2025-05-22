package com.soufianodev.rescent.model

/**
 * Data class representing a semantic version number for the extension.
 * Handles parsing and formatting of version strings.
 *
 * @property major Major version number
 * @property minor Minor version number
 * @property patch Patch version number
 */
data class ExtensionVersion(
    val major: Int,
    val minor: Int,
    val patch: Int
) {
    companion object {
        /**
         * Creates an ExtensionVersion from a version string.
         *
         * @param version Version string in format "x.y.z"
         * @return ExtensionVersion instance
         * @throws IllegalArgumentException if version string is invalid
         */
        @JvmStatic
        fun fromString(version: String): ExtensionVersion {
            val trimmedVersion = version.trim()
            val parts = trimmedVersion.split(".")
            
            require(parts.size == 3) { "Version must be in format 'x.y.z'" }
            
            return try {
                ExtensionVersion(
                    major = parts[0].toInt(),
                    minor = parts[1].toInt(),
                    patch = parts[2].toInt()
                )
            } catch (e: NumberFormatException) {
                throw IllegalArgumentException("Invalid version format: "+e.message)
            }
        }
    }

    override fun toString(): String = "$major.$minor.$patch"
}
