/** Google Drive logo loaded from public/icons/google-drive.svg */
export default function GoogleDriveIcon({ size = 75 }: { size?: number }) {
	return (
		// biome-ignore lint/a11y/useAltText: decorative brand icon within a labeled button
		<img src="/icons/google-drive.svg" width={size} height={size} aria-hidden />
	)
}
