/*******************************************************************************
 * Copyright (c) 2011 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 *******************************************************************************/
package org.eclipse.scout.rt.ui.rap.keystroke;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.eclipse.rwt.RWT;
import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.commons.StringUtility;
import org.eclipse.scout.commons.logger.IScoutLogger;
import org.eclipse.scout.commons.logger.ScoutLogManager;
import org.eclipse.scout.rt.ui.rap.IRwtEnvironment;
import org.eclipse.scout.rt.ui.rap.util.RwtUtility;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.KeyAdapter;
import org.eclipse.swt.events.KeyEvent;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Event;
import org.eclipse.swt.widgets.Listener;
import org.eclipse.swt.widgets.Widget;

/**
 * <h3>KeyStrokeManager</h3> ...
 * 
 * @since 3.7.0 June 2011
 */
public class KeyStrokeManager implements IKeyStrokeManager {
  private static IScoutLogger LOG = ScoutLogManager.getLogger(KeyStrokeManager.class);

  private Listener m_keyListener;
  private KeyAdapter m_keyAdapter;
  private List<IRwtKeyStroke> m_globalKeyStrokes;
  private Map<Widget, List<String>> m_widgetKeys;

  private boolean m_globalKeyStrokesActivated = false;
  private Object m_globalKeyStrokeListLock;
  private final IRwtEnvironment m_environment;

  public KeyStrokeManager(IRwtEnvironment environment) {
    m_environment = environment;
    m_globalKeyStrokeListLock = new Object();
    m_globalKeyStrokes = new ArrayList<IRwtKeyStroke>();
    m_widgetKeys = new HashMap<Widget, List<String>>();

    m_keyListener = new Listener() {
      private static final long serialVersionUID = 1L;

      @Override
      public void handleEvent(final Event event) {
        if (event.keyCode > 0 && event.display != null) {
          System.out.println("Listener KeyCode: int: " + event.keyCode + " char: " + (char) event.keyCode);
          event.display.asyncExec(new Runnable() {
            @Override
            public void run() {
              handleKeyEvent(event);
            }
          });
        }
      }
    };
    m_keyAdapter = new KeyAdapter() {
      private static final long serialVersionUID = 1L;

      @Override
      public void keyPressed(final KeyEvent e) {
        if (e.keyCode > 0 && e.display != null) {
          System.out.println("Adapter KeyCode: int: " + e.keyCode + " char: " + (char) e.keyCode);
          e.display.asyncExec(new Runnable() {
            @Override
            public void run() {
              handleKeyEvent(e);
            }
          });
        }
      }
    };
    environment.getDisplay().addFilter(SWT.KeyDown, m_keyListener);
  }

  @Override
  public void addGlobalKeyStroke(IRwtKeyStroke stroke) {
    synchronized (m_globalKeyStrokeListLock) {
      m_globalKeyStrokes.add(stroke);
      updateGlobalActiveKeys();
//      updateActiveKeys();
    }
  }

  @Override
  public boolean removeGlobalKeyStroke(IRwtKeyStroke stroke) {
    synchronized (m_globalKeyStrokeListLock) {
      boolean retVal = m_globalKeyStrokes.remove(stroke);
      updateGlobalActiveKeys();
//      updateActiveKeys();
      return retVal;
    }
  }

  protected List<IRwtKeyStroke> getGlobalKeyStrokes() {
    synchronized (m_globalKeyStrokeListLock) {
      return m_globalKeyStrokes;
    }
  }

  @Override
  public void addKeyStroke(Control control, IRwtKeyStroke stroke) {
    @SuppressWarnings("unchecked")
    List<IRwtKeyStroke> keyStrokes = (List<IRwtKeyStroke>) control.getData(DATA_KEY_STROKES);
    if (keyStrokes == null) {
      keyStrokes = new ArrayList<IRwtKeyStroke>();
    }
    keyStrokes.add(stroke);
    control.setData(DATA_KEY_STROKES, keyStrokes);

    List<String> widgetKeys = m_widgetKeys.get(control);
    if (widgetKeys == null) {
      widgetKeys = new ArrayList<String>();
    }
    widgetKeys.add(resolveActiveKey(stroke));
    m_widgetKeys.put(control, widgetKeys);
    updateActiveKeys(control);
  }

  @Override
  public boolean removeKeyStroke(Control control, IRwtKeyStroke stroke) {
    boolean retVal = false;
    @SuppressWarnings("unchecked")
    List<IRwtKeyStroke> keyStrokes = (List<IRwtKeyStroke>) control.getData(DATA_KEY_STROKES);
    if (keyStrokes != null) {
      retVal = keyStrokes.remove(stroke);
      control.setData(DATA_KEY_STROKES, keyStrokes);
    }

    List<String> widgetKeys = m_widgetKeys.get(control);
    if (widgetKeys != null) {
      widgetKeys.remove(resolveActiveKey(stroke));
      m_widgetKeys.put(control, widgetKeys);
    }
    updateActiveKeys(control);

    return retVal;
  }

  @Override
  public boolean removeKeyStrokes(Control control) {
    boolean retVal = false;
    for (IRwtKeyStroke stroke : new ArrayList<IRwtKeyStroke>(getKeyStrokes(control))) {
      retVal &= removeKeyStroke(control, stroke);
    }
    control.setData(DATA_KEY_STROKES, null);
    return retVal;
  }

  @SuppressWarnings("unchecked")
  protected List<IRwtKeyStroke> getKeyStrokes(Widget widget) {
    Object data = widget.getData(DATA_KEY_STROKES);
    List<IRwtKeyStroke> keyStrokes = null;
    if (data instanceof List && ((List<IRwtKeyStroke>) data).size() > 0) {
      keyStrokes = (List<IRwtKeyStroke>) data;
    }
    else {
      keyStrokes = Collections.emptyList();
    }
    return keyStrokes;
  }

//  private void updateActiveKeys() {
//    Set<String> activeKeys = new HashSet<String>(m_globalKeyStrokes.size());
//
//    for (IRwtKeyStroke stroke : m_globalKeyStrokes) {
//      String activeKey = resolveActiveKey(stroke);
//
//      activeKeys.add(activeKey);
//    }
//
//    for (Entry<Widget, List<String>> entry : m_widgetKeys.entrySet()) {
//      for (String activeKey : entry.getValue()) {
//        activeKeys.add(activeKey);
//      }
//    }
//
//    String[] activeKeyArray = activeKeys.toArray(new String[activeKeys.size()]);
//    m_environment.getDisplay().setData(RWT.ACTIVE_KEYS, activeKeyArray);
//  }

  private void updateGlobalActiveKeys() {
    Set<String> activeKeys = new HashSet<String>(m_globalKeyStrokes.size());

    for (IRwtKeyStroke stroke : m_globalKeyStrokes) {
      String activeKey = resolveActiveKey(stroke);

      activeKeys.add(activeKey);
    }

    String[] activeKeyArray = activeKeys.toArray(new String[activeKeys.size()]);
    m_environment.getDisplay().setData(RWT.ACTIVE_KEYS, activeKeyArray);
  }

  private void updateActiveKeys(Control control) {
    List<String> activeKeys = m_widgetKeys.get(control);

    String[] activeKeyArray = activeKeys.toArray(new String[activeKeys.size()]);
    control.addKeyListener(m_keyAdapter);
    control.setData(RWT.ACTIVE_KEYS, activeKeyArray);
//    control.setData(RWT.CANCEL_KEYS, activeKeyArray);
  }

  private String resolveActiveKey(IRwtKeyStroke stroke) {
    //resolve modifier
    String modifier = "";
    if (stroke.getStateMask() > 0) {
      List<String> modifiers = new ArrayList<String>();
      if ((stroke.getStateMask() & SWT.SHIFT) == SWT.SHIFT) {
        modifiers.add("SHIFT");
      }
      if ((stroke.getStateMask() & SWT.ALT) == SWT.ALT) {
        modifiers.add("ALT");
      }
      if ((stroke.getStateMask() & SWT.CTRL) == SWT.CTRL
          || (stroke.getStateMask() & SWT.COMMAND) == SWT.COMMAND) {
        modifiers.add("CTRL");
      }
      modifier = StringUtility.join("+", CollectionUtility.toArray(modifiers, String.class));
    }

    //resolve key
    String key = RwtUtility.getKeyTextUpper(stroke.getKeyCode());

    //concatenate modifier & key
    String activeKey = StringUtility.join("+", modifier, key);
    return activeKey;
  }

  private void handleKeyEvent(KeyEvent e) {
    // do not touch the original event
    Event eventCopy = new Event();
    eventCopy.character = e.character;
    eventCopy.data = e.data;
    eventCopy.display = e.display;
    eventCopy.doit = e.doit;
    eventCopy.keyCode = e.keyCode;
    eventCopy.stateMask = e.stateMask;
    eventCopy.widget = e.widget;

    handleKeyEventHierarchical(eventCopy, e.display.getFocusControl());
    if (eventCopy.doit) {
      // handle global key strokes
      if (isGlobalKeyStrokesActivated()) {
        for (IRwtKeyStroke keyStroke : getGlobalKeyStrokes()) {
          if (keyStroke.getKeyCode() == eventCopy.keyCode && keyStroke.getStateMask() == eventCopy.stateMask) {
            keyStroke.handleUiAction(eventCopy);
            if (!eventCopy.doit) {
              break;
            }
          }
        }
      }
    }
    e.doit = eventCopy.doit;
  }

  private void handleKeyEvent(Event event) {
    // do not touch the original event
    Event eventCopy = new Event();
    eventCopy.button = event.button;
    eventCopy.character = event.character;
    eventCopy.count = event.count;
    eventCopy.data = event.data;
    eventCopy.detail = event.detail;
    eventCopy.display = event.display;
    eventCopy.doit = event.doit;
    eventCopy.end = event.end;
    eventCopy.gc = event.gc;
    eventCopy.height = event.height;
    eventCopy.index = event.index;
    eventCopy.item = event.item;
    eventCopy.keyCode = event.keyCode;
    eventCopy.start = event.start;
    eventCopy.stateMask = event.stateMask;
    eventCopy.text = event.text;
    eventCopy.time = event.time;
    eventCopy.type = event.type;
    eventCopy.widget = event.widget;
    eventCopy.width = event.width;
    eventCopy.x = event.x;
    eventCopy.y = event.y;
    handleKeyEventHierarchical(eventCopy, event.display.getFocusControl());
    if (eventCopy.doit) {
      // handle global key strokes
      if (isGlobalKeyStrokesActivated()) {
        for (IRwtKeyStroke keyStroke : getGlobalKeyStrokes()) {
          if (keyStroke.getKeyCode() == eventCopy.keyCode && keyStroke.getStateMask() == eventCopy.stateMask) {
            keyStroke.handleUiAction(eventCopy);
            if (!eventCopy.doit) {
              break;
            }
          }
        }
      }
    }
    event.doit = eventCopy.doit;
  }

  private void handleKeyEventHierarchical(Event event, Widget widget) {
    if (widget == null) {
      return;
    }
    // key stroke handling
    for (IRwtKeyStroke keyStroke : getKeyStrokes(widget)) {
      if (RwtUtility.getKeyTextUpper(event.keyCode).equals(RwtUtility.getKeyTextUpper(keyStroke.getKeyCode()))
          && keyStroke.getStateMask() == event.stateMask) {
        keyStroke.handleUiAction(event);
        if (!event.doit) {
          return;
        }
      }
    }
    if (widget instanceof Control) {
      handleKeyEventHierarchical(event, ((Control) widget).getParent());
    }
  }

  public boolean isGlobalKeyStrokesActivated() {
    return m_globalKeyStrokesActivated;
  }

  public void setGlobalKeyStrokesActivated(boolean globalKeyStrokesActivated) {
    m_globalKeyStrokesActivated = globalKeyStrokesActivated;
  }
}
