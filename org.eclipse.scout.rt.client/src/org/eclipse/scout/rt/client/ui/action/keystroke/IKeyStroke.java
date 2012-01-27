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
package org.eclipse.scout.rt.client.ui.action.keystroke;

import org.eclipse.scout.rt.client.ui.action.IAction;

/**
 * A key stroke consists of a action and a key spec<br>
 * The key spec is a key name together with the modifiers shift, control, alt
 * 
 * @see IAction#getKeyStroke()
 */
public interface IKeyStroke extends IAction {

}
