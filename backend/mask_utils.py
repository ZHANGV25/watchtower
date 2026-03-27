"""Utilities for processing YOLO segmentation masks into polygon points."""
from __future__ import annotations

import numpy as np

from models import PolygonPoint

MAX_POLYGON_POINTS = 50


def extract_mask_polygon(
    masks: object | None,
    idx: int,
    frame_w: int,
    frame_h: int,
) -> list[PolygonPoint] | None:
    """Extract a segmentation mask polygon for the detection at the given index.

    The YOLO seg model provides masks.xy — a list of (N, 2) arrays where
    each array contains the (x_pixel, y_pixel) polygon vertices for one
    detection. We convert to percentage coordinates and downsample to
    keep payload size reasonable.

    Args:
        masks: YOLO masks object (has .xy attribute) or None.
        idx: Index of the detection to extract.
        frame_w: Frame width in pixels.
        frame_h: Frame height in pixels.

    Returns:
        List of PolygonPoint in percentage coordinates, or None.
    """
    if masks is None:
        return None

    xy_list = getattr(masks, "xy", None)
    if xy_list is None or idx >= len(xy_list):
        return None

    polygon_xy = xy_list[idx]
    if len(polygon_xy) == 0:
        return None

    # Downsample if too many points
    if len(polygon_xy) > MAX_POLYGON_POINTS:
        indices = np.linspace(0, len(polygon_xy) - 1, MAX_POLYGON_POINTS, dtype=int)
        polygon_xy = polygon_xy[indices]

    return [
        PolygonPoint(
            x=(float(pt[0]) / frame_w) * 100,
            y=(float(pt[1]) / frame_h) * 100,
        )
        for pt in polygon_xy
    ]
