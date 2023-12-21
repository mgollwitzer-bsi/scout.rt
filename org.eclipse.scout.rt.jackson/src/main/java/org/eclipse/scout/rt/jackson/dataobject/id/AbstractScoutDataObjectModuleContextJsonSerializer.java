/*
 * Copyright (c) 2010, 2024 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.jackson.dataobject.id;

import java.util.Collection;

import org.eclipse.scout.rt.dataobject.id.IdCodec.IIdCodecFlag;
import org.eclipse.scout.rt.jackson.dataobject.ScoutDataObjectModuleContext;
import org.eclipse.scout.rt.platform.util.LazyValue;

import com.fasterxml.jackson.databind.JsonSerializer;

/**
 * Abstract {@link JsonSerializer} with {@link ScoutDataObjectModuleContext} that provides information about the
 * {@link IIdCodecFlag}s of the context.
 */
public abstract class AbstractScoutDataObjectModuleContextJsonSerializer<T> extends JsonSerializer<T> {

  protected final ScoutDataObjectModuleContext m_moduleContext;
  protected final LazyValue<Collection<IIdCodecFlag>> m_idCodecFlags = new LazyValue<>(() -> computeIdCodecFlags());

  public AbstractScoutDataObjectModuleContextJsonSerializer(ScoutDataObjectModuleContext moduleContext) {
    m_moduleContext = moduleContext;
  }

  protected ScoutDataObjectModuleContext moduleContext() {
    return m_moduleContext;
  }

  protected Collection<IIdCodecFlag> computeIdCodecFlags() {
    return IdCodecUtility.getIdCodecFlags(moduleContext());
  }

  protected Collection<IIdCodecFlag> idCodecFlags() {
    return m_idCodecFlags.get();
  }
}
