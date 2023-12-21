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

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;

/**
 * Abstract {@link StdSerializer} with {@link ScoutDataObjectModuleContext} that provides information about the
 * {@link IIdCodecFlag}s of the context.
 */
public abstract class AbstractScoutDataObjectModuleContextStdSerializer<T> extends StdSerializer<T> {
  private static final long serialVersionUID = 1L;

  protected final ScoutDataObjectModuleContext m_moduleContext;
  protected final LazyValue<Collection<IIdCodecFlag>> m_idCodecFlags = new LazyValue<>(() -> computeIdCodecFlags());

  public AbstractScoutDataObjectModuleContextStdSerializer(ScoutDataObjectModuleContext moduleContext, Class<?> valueClass) {
    super(valueClass, false);
    m_moduleContext = moduleContext;
  }

  public AbstractScoutDataObjectModuleContextStdSerializer(ScoutDataObjectModuleContext moduleContext, JavaType valueType) {
    super(valueType);
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
