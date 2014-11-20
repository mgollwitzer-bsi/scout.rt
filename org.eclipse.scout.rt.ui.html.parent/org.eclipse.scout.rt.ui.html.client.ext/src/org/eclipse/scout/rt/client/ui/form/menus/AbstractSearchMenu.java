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
package org.eclipse.scout.rt.client.ui.form.menus;

import java.util.Set;

import org.eclipse.scout.commons.CollectionUtility;
import org.eclipse.scout.rt.client.ui.action.menu.IMenuType;
import org.eclipse.scout.rt.client.ui.form.FormMenuType;
import org.eclipse.scout.rt.shared.ScoutTexts;
import org.eclipse.scout.rt.shared.ui.menu.AbstractMenu5;

public abstract class AbstractSearchMenu extends AbstractMenu5 {

  @Override
  protected Set<? extends IMenuType> getConfiguredMenuTypes() {
    return CollectionUtility.hashSet(FormMenuType.System);
  }

  /*
   * Configuration
   */
  @Override
  protected int getConfiguredSystemType() {
    return SYSTEM_TYPE_SAVE_WITHOUT_MARKER_CHANGE;
  }

  @Override
  protected String getConfiguredText() {
    return ScoutTexts.get("SearchButton");
  }

  @Override
  protected String getConfiguredTooltipText() {
    return ScoutTexts.get("SearchButtonTooltip");
  }

  @Override
  protected boolean getConfiguredIsDefault() {
    return true;
  }
}
