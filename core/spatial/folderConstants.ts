export const FOLDER_SIZE = 120
export const THUMBNAIL_WIDTH = 73
export const THUMBNAIL_HEIGHT = 94
export const CARD_WIDTH = 232
export const CARD_HEIGHT = 300
export const GATHER_SCALE = THUMBNAIL_WIDTH / CARD_WIDTH
/** Canvas card anchor in absolute pixels (center-x, 4px from bottom of card) */
export const CARD_ANCHOR_PX = `${CARD_WIDTH / 2}px ${CARD_HEIGHT - 4}px`
export const ANCHOR_OFFSET_X = CARD_WIDTH / 2 - FOLDER_SIZE / 2 // 56
export const ANCHOR_OFFSET_Y =
	CARD_HEIGHT - 4 - ((FOLDER_SIZE - THUMBNAIL_HEIGHT) / 2 + THUMBNAIL_HEIGHT - 4) // 193
