/*******************************************************************************
 * Copyright (c) 2010 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.ui.swing.basic.table;

import java.awt.AWTKeyStroke;
import java.awt.Component;
import java.awt.FocusTraversalPolicy;
import java.awt.Insets;
import java.awt.KeyboardFocusManager;
import java.awt.event.ActionEvent;
import java.awt.event.HierarchyEvent;
import java.awt.event.HierarchyListener;
import java.awt.event.MouseEvent;
import java.beans.PropertyChangeEvent;
import java.beans.PropertyChangeListener;
import java.lang.ref.WeakReference;
import java.util.EventObject;
import java.util.HashSet;
import java.util.concurrent.atomic.AtomicReference;

import javax.swing.AbstractAction;
import javax.swing.AbstractCellEditor;
import javax.swing.JComponent;
import javax.swing.JTable;
import javax.swing.SwingUtilities;
import javax.swing.event.CellEditorListener;
import javax.swing.event.ChangeEvent;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.TableCellEditor;
import javax.swing.table.TableCellRenderer;

import org.eclipse.scout.rt.client.ui.basic.table.ITableRow;
import org.eclipse.scout.rt.client.ui.basic.table.columns.IBooleanColumn;
import org.eclipse.scout.rt.client.ui.basic.table.columns.IColumn;
import org.eclipse.scout.rt.client.ui.form.fields.GridData;
import org.eclipse.scout.rt.client.ui.form.fields.IFormField;
import org.eclipse.scout.rt.ui.swing.SingleLayout;
import org.eclipse.scout.rt.ui.swing.SwingUtility;
import org.eclipse.scout.rt.ui.swing.basic.ISwingScoutComposite;
import org.eclipse.scout.rt.ui.swing.ext.JPanelEx;
import org.eclipse.scout.rt.ui.swing.focus.SwingScoutFocusTraversalPolicy;

public class SwingScoutTableCellEditor {

  /**
   * Property to access the table cell's insets within the inline editor. The insets are registered as client property
   * in {@link JTable}.
   */
  public static final String TABLE_CELL_INSETS = SwingScoutTableCellEditor.class.getName() + "#insets";

  private ISwingScoutTable m_tableComposite;
  private FocusTraversalPolicy m_focusTraversalPolicy;
  private TableCellEditor m_cellEditor;
  //cache
  private boolean m_tableIsEditingAndContainsFocus;
  private JComponent m_cachedSwingEditorComponent;

  public SwingScoutTableCellEditor(ISwingScoutTable tableComposite) {
    m_tableComposite = tableComposite;
    m_focusTraversalPolicy = new SwingScoutFocusTraversalPolicy();
    m_cellEditor = new P_SwingCellEditor();
    m_cellEditor.addCellEditorListener(new CellEditorListener() {
      @Override
      public void editingStopped(ChangeEvent e) {
        saveEditorFromSwing();
      }

      @Override
      public void editingCanceled(ChangeEvent e) {
        cancelEditorFromSwing();
      }
    });
  }

  //(re)install cell editors
  public void initialize() {
    m_tableComposite.getSwingTable().setDefaultEditor(Object.class, m_cellEditor);
  }

  protected JComponent getCachedEditorComposite(int row, int col) {
    if (m_cachedSwingEditorComponent == null) {
      ISwingScoutComposite<? extends IFormField> editorComposite = createEditorComposite(row, col);
      if (editorComposite != null) {
        decorateEditorComposite(editorComposite, row, col);
        m_cachedSwingEditorComponent = editorComposite.getSwingContainer();
      }
      else {
        m_cachedSwingEditorComponent = null;
      }
    }
    return m_cachedSwingEditorComponent;
  }

  @SuppressWarnings("unchecked")
  protected ISwingScoutComposite<? extends IFormField> createEditorComposite(int row, int col) {
    final ITableRow scoutRow = m_tableComposite.getScoutObject().getFilteredRow(row);
    final IColumn scoutColumn = m_tableComposite.getScoutObject().getColumnSet().getVisibleColumn(col);
    final AtomicReference<IFormField> fieldRef = new AtomicReference<IFormField>();
    if (scoutRow != null && scoutColumn != null) {
      Runnable t = new Runnable() {
        @Override
        public void run() {
          fieldRef.set(m_tableComposite.getScoutObject().getUIFacade().prepareCellEditFromUI(scoutRow, scoutColumn));
          synchronized (fieldRef) {
            fieldRef.notifyAll();
          }
        }
      };
      synchronized (fieldRef) {
        m_tableComposite.getSwingEnvironment().invokeScoutLater(t, 2345);
        try {
          fieldRef.wait(2345);
        }
        catch (InterruptedException e) {
          //nop
        }
      }
    }
    if (fieldRef.get() != null) {
      // propagate vertical and horizontal alignment to @{link IBooleanField} (to layout properly)
      if (scoutColumn instanceof IBooleanColumn) {
        GridData gd = fieldRef.get().getGridDataHints();
        gd.verticalAlignment = ((IBooleanColumn) scoutColumn).getVerticalAlignment();
        gd.horizontalAlignment = scoutColumn.getHorizontalAlignment();
        fieldRef.get().setGridDataHints(gd);
      }

      // propagate insets of table cell to inline editor (to layout properly)
      Insets cellInsets = new Insets(0, 0, 0, 0);
      TableCellRenderer cellRenderer = m_tableComposite.getSwingTable().getCellRenderer(row, col);
      cellRenderer = (TableCellRenderer) m_tableComposite.getSwingTable().prepareRenderer(cellRenderer, row, col); // do not remove this call to ensure TableCellRenderer properties (e.g. insets) really belongs to the given cell (col, row). This seems to be a bug.
      if (cellRenderer instanceof DefaultTableCellRenderer) {
        cellInsets = ((DefaultTableCellRenderer) cellRenderer).getInsets();
      }

      m_tableComposite.getSwingTable().putClientProperty(SwingScoutTableCellEditor.TABLE_CELL_INSETS, cellInsets);
      try {
        return m_tableComposite.getSwingEnvironment().createFormField(m_tableComposite.getSwingTable(), fieldRef.get());
      }
      finally {
        m_tableComposite.getSwingTable().putClientProperty(SwingScoutTableCellEditor.TABLE_CELL_INSETS, null);
      }
    }
    else {
      return null;
    }
  }

  protected void decorateEditorComposite(ISwingScoutComposite<? extends IFormField> editorComposite, final int row, final int col) {
    JComponent editorField = editorComposite.getSwingContainer();
    Component firstField = m_focusTraversalPolicy.getFirstComponent(editorField);
    Component lastField = m_focusTraversalPolicy.getLastComponent(editorField);
    if (firstField != null) {
      firstField.addHierarchyListener(new HierarchyListener() {
        @Override
        public void hierarchyChanged(final HierarchyEvent e) {
          if (e.getID() == HierarchyEvent.HIERARCHY_CHANGED) {
            if (((e.getChangeFlags() & HierarchyEvent.SHOWING_CHANGED) != 0) && e.getComponent().isShowing()) {
              SwingUtilities.invokeLater(
                  new Runnable() {
                    @Override
                    public void run() {
                      e.getComponent().requestFocus();
                    }
                  });
            }
          }
        }
      });
    }
    if (firstField instanceof JComponent) {
      JComponent jc = (JComponent) firstField;
      jc.setFocusTraversalKeys(KeyboardFocusManager.BACKWARD_TRAVERSAL_KEYS, new HashSet<AWTKeyStroke>());
      jc.getInputMap(JComponent.WHEN_FOCUSED).put(SwingUtility.createKeystroke("shift TAB"), "reverse-tab");
      jc.getActionMap().put("reverse-tab", new AbstractAction() {
        private static final long serialVersionUID = 1L;

        @Override
        public void actionPerformed(ActionEvent e) {
          m_cellEditor.stopCellEditing();
          editPreviousTableCell(row, col);
        }
      });
    }
    if (lastField instanceof JComponent) {
      JComponent jc = (JComponent) lastField;
      jc.setFocusTraversalKeys(KeyboardFocusManager.FORWARD_TRAVERSAL_KEYS, new HashSet<AWTKeyStroke>());
      jc.getInputMap(JComponent.WHEN_FOCUSED).put(SwingUtility.createKeystroke("TAB"), "tab");
      jc.getActionMap().put("tab", new AbstractAction() {
        private static final long serialVersionUID = 1L;

        @Override
        public void actionPerformed(ActionEvent e) {
          m_cellEditor.stopCellEditing();
          editNextTableCell(row, col);
        }
      });
    }
  }

  protected void saveEditorFromSwing() {
    m_tableIsEditingAndContainsFocus = false;
    if (m_cachedSwingEditorComponent != null) {
      m_cachedSwingEditorComponent = null;
      Runnable t = new Runnable() {
        @Override
        public void run() {
          m_tableComposite.getScoutObject().getUIFacade().completeCellEditFromUI();
        }
      };
      m_tableComposite.getSwingEnvironment().invokeScoutLater(t, 0);
    }
  }

  protected void cancelEditorFromSwing() {
    m_tableIsEditingAndContainsFocus = false;
    if (m_cachedSwingEditorComponent != null) {
      m_cachedSwingEditorComponent = null;
      Runnable t = new Runnable() {
        @Override
        public void run() {
          m_tableComposite.getScoutObject().getUIFacade().cancelCellEditFromUI();
        }
      };
      m_tableComposite.getSwingEnvironment().invokeScoutLater(t, 0);
    }
  }

  protected void editNextTableCell(int row, int col) {
    JTable table = m_tableComposite.getSwingTable();
    if (row >= 0 && col >= 0) {
      int rowCount = table.getRowCount();
      int colCount = table.getColumnCount();
      int a = rowCount + colCount;
      while (a > 1) {
        a--;
        col++;
        if (col >= colCount) {
          row++;
          col = 0;
        }
        if (row >= rowCount) {
          row = 0;
        }
        if (table.isCellEditable(row, col)) {
          table.getSelectionModel().setSelectionInterval(row, row);
          table.getColumnModel().getSelectionModel().setSelectionInterval(col, col);
          table.scrollRectToVisible(table.getCellRect(row, col, true));
          table.editCellAt(row, col);
          return;
        }
      }
    }
  }

  protected void editPreviousTableCell(int row, int col) {
    JTable table = m_tableComposite.getSwingTable();
    if (row >= 0 && col >= 0) {
      int rowCount = table.getRowCount();
      int colCount = table.getColumnCount();
      int a = rowCount + colCount;
      while (a > 1) {
        a--;
        col--;
        if (col < 0) {
          row--;
          col = colCount - 1;
        }
        if (row < 0) {
          row = rowCount - 1;
        }
        if (table.isCellEditable(row, col)) {
          table.getSelectionModel().setSelectionInterval(row, row);
          table.getColumnModel().getSelectionModel().setSelectionInterval(col, col);
          table.scrollRectToVisible(table.getCellRect(row, col, true));
          table.editCellAt(row, col);
          return;
        }
      }
    }
  }

  protected void permanentFocusOwnerChanged(PropertyChangeEvent e) {
    Component c = (Component) e.getNewValue();
    if (c == null) {
      return;
    }
    boolean oldValue = m_tableIsEditingAndContainsFocus;
    boolean newValue = SwingUtilities.isDescendingFrom(c, m_tableComposite.getSwingTable()) && c != m_tableComposite.getSwingTable();
    m_tableIsEditingAndContainsFocus = newValue;
    if (oldValue && !newValue) {
      if (m_cellEditor != null) {
        m_cellEditor.stopCellEditing();
      }
    }
  }

  private class P_SwingCellEditor extends AbstractCellEditor implements TableCellEditor {
    private static final long serialVersionUID = 1L;

    /**
     * An integer specifying the number of clicks needed to start editing.
     * Even if <code>clickCountToStart</code> is defined as zero, it
     * will not initiate until a click occurs.
     */
    private int m_clickCountToStart = 1;
    private JPanelEx m_container;

    public P_SwingCellEditor() {
      m_container = new JPanelEx(new SingleLayout());
      m_container.setOpaque(false);
      m_container.getInputMap(JComponent.WHEN_ANCESTOR_OF_FOCUSED_COMPONENT).put(SwingUtility.createKeystroke("ESCAPE"), "cancel");
      m_container.getInputMap(JComponent.WHEN_ANCESTOR_OF_FOCUSED_COMPONENT).put(SwingUtility.createKeystroke("ENTER"), "enter");
      m_container.getActionMap().put("cancel", new AbstractAction() {
        private static final long serialVersionUID = 1L;

        @Override
        public void actionPerformed(ActionEvent e) {
          m_cellEditor.cancelCellEditing();
        }
      });
      m_container.getActionMap().put("enter", new AbstractAction() {
        private static final long serialVersionUID = 1L;

        @Override
        public void actionPerformed(ActionEvent e) {
          m_cellEditor.stopCellEditing();
        }
      });
      //add a hysteresis listener that commits the cell editor when the table has first received focus and then lost it
      KeyboardFocusManager.getCurrentKeyboardFocusManager().addPropertyChangeListener("permanentFocusOwner", new GlobalFocusListener(SwingScoutTableCellEditor.this));
    }

    public void setClickCountToStart(int count) {
      m_clickCountToStart = count;
    }

    public int getClickCountToStart() {
      return m_clickCountToStart;
    }

    @Override
    public Object getCellEditorValue() {
      return null;
    }

    @Override
    public boolean isCellEditable(EventObject anEvent) {
      if (anEvent instanceof MouseEvent) {
        return ((MouseEvent) anEvent).getClickCount() >= getClickCountToStart();
      }
      return true;
    }

    @Override
    public Component getTableCellEditorComponent(final JTable table, Object value, boolean isSelected, final int row, final int column) {
      m_container.removeAll();
      Component c = getCachedEditorComposite(row, column);
      if (c != null) {
        m_container.add(c);
      }
      return m_container;
    }
  }

  private static class GlobalFocusListener implements PropertyChangeListener {
    private WeakReference<SwingScoutTableCellEditor> m_editorRef;

    public GlobalFocusListener(SwingScoutTableCellEditor editor) {
      m_editorRef = new WeakReference<SwingScoutTableCellEditor>(editor);
    }

    @Override
    public void propertyChange(PropertyChangeEvent e) {
      SwingScoutTableCellEditor editor = m_editorRef.get();
      if (editor == null) {
        //auto-detach
        KeyboardFocusManager.getCurrentKeyboardFocusManager().removePropertyChangeListener("permanentFocusOwner", this);
        return;
      }
      editor.permanentFocusOwnerChanged(e);
    }
  }

}
