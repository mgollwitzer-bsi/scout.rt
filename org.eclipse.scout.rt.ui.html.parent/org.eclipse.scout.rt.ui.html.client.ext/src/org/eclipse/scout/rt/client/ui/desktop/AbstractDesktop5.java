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
package org.eclipse.scout.rt.client.ui.desktop;

import java.util.ArrayList;
import java.util.List;

public abstract class AbstractDesktop5 extends AbstractDesktop implements IDesktop5 {

  private List<Object> m_addOns = new ArrayList<>();

  @Override
  public List<Object> getAddOns() {
    return m_addOns;
  }

}
