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
package org.eclipse.scout.rt.ui.rap.form.fields.colorpickerfield;

import org.eclipse.scout.rt.client.ui.form.fields.colorpickerfield.IColorField;
import org.eclipse.scout.rt.ui.rap.form.fields.IRwtScoutFormField;

/**
 *
 */
public interface IRwtScoutColorField extends IRwtScoutFormField<IColorField> {
  String VARIANT_COLOR_FIELD = "colorfield";
  String VARIANT_COLOR_FIELD_DISABLED = "colorfield-disabled";
}
