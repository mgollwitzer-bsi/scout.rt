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
package org.eclipse.scout.commons.dnd;

/**
 * This is the super class of a transfer object model, normally this type is not used directly but any subtype of it.
 */
public class TransferObject {

  private String m_mimeType;

  public String getMimeType() {
    return m_mimeType;
  }

  public void setMimeType(String mimeType) {
    m_mimeType = mimeType;
  }

  public boolean isText() {
    return false;
  }

  public boolean isFileList() {
    return false;
  }

  public boolean isImage() {
    return false;
  }

  public boolean isLocalObject() {
    return false;
  }

}
