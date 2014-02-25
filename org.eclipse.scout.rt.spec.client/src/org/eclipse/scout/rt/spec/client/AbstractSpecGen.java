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
package org.eclipse.scout.rt.spec.client;

import java.io.File;
import java.io.Writer;

import org.eclipse.scout.commons.exception.ProcessingException;
import org.eclipse.scout.rt.spec.client.config.DefaultDocConfig;
import org.eclipse.scout.rt.spec.client.config.IDocConfig;
import org.eclipse.scout.rt.spec.client.config.SpecFileConfig;
import org.eclipse.scout.rt.spec.client.out.IDocSection;
import org.eclipse.scout.rt.spec.client.out.mediawiki.MediawikiWriter;
import org.junit.Test;

/**
 * Base class for all spec test
 */
public abstract class AbstractSpecGen {

  /**
   * Generate spec in one or more mediawiki files
   * <p>
   * ATTENTION: implementations need to be annotated with @{@link Test}
   * 
   * @throws ProcessingException
   */
  abstract public void generateSpec() throws ProcessingException;

  protected SpecFileConfig getFileConfig() {
    return SpecIOUtility.getSpecFileConfigInstance();
  }

  protected IDocConfig getConfiguration() {
    return new DefaultDocConfig();
  }

  /**
   * @param section
   * @param fileBaseName
   *          file name without extension
   * @param imagePaths
   * @throws ProcessingException
   */
  protected void writeMediawikiFile(IDocSection section, String fileBaseName, String[] imagePaths) throws ProcessingException {
    File wiki = SpecIOUtility.createNewFile(getFileConfig().getMediawikiDir(), fileBaseName, ".mediawiki");
    Writer fileWriter = SpecIOUtility.createWriter(wiki);
    MediawikiWriter w = new MediawikiWriter(fileWriter, section, imagePaths);
    w.write();
  }

}
