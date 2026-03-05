import { memo, CSSProperties, ReactNode } from 'react';
import { Grid } from 'react-window';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  columns?: number;
  columnWidth?: number;
  gap?: number;
  className?: string;
  width?: number | string;
  height?: number | string;
}

// Custom comparison function for memo
const arePropsEqual = (prev: any, next: any) => {
  return (
    prev.columnIndex === next.columnIndex &&
    prev.rowIndex === next.rowIndex &&
    prev.style === next.style
  );
};

/**
 * VirtualList component - Virtual scrolling list for performance
 */
const VirtualList = <T,>({
  items,
  renderItem,
  itemHeight = 200,
  columns = 1,
  columnWidth,
  gap = 24,
  className = '',
  width,
  height
}: VirtualListProps<T>) => {
  if (items.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center opacity-50">
        <p className="text-xl font-bold">No items found.</p>
      </div>
    );
  }

  // Calculate container width
  const containerWidth = typeof width === 'number' ? width : '100%';

  // Calculate column width
  const calculatedColumnWidth = columnWidth || (typeof width === 'number' ? width / columns - gap : 300);

  // Render cell
  const Cell = memo(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columns + columnIndex;
    if (index >= items.length) return null;

    // Adjust style to add gap
    const cellStyle: CSSProperties = {
      ...(style as CSSProperties),
      left: typeof style.left === 'number' ? style.left + (columnIndex * gap / columns) : style.left,
      top: typeof style.top === 'number' ? style.top + (rowIndex * gap / columns) : style.top,
      width: calculatedColumnWidth ? calculatedColumnWidth - gap : style.width,
    };

    return (
      <div style={cellStyle}>
        {renderItem(items[index], index)}
      </div>
    );
  }, arePropsEqual);

  // Calculate row count
  const rowCount = Math.ceil(items.length / columns);

  const gridHeight = typeof height === 'number' ? height : 600;

  return (
    <div className={className} style={{ height: typeof height === 'number' ? `${height}px` : (height || '600px') }}>
      <Grid
        columnCount={columns}
        columnWidth={calculatedColumnWidth}
        rowCount={rowCount}
        rowHeight={itemHeight}
        width={containerWidth}
        {...{ height: gridHeight } as any}
      >
        {Cell as any}
      </Grid>
    </div>
  );
};

VirtualList.displayName = 'VirtualList';

export default VirtualList;
