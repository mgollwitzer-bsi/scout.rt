/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package org.eclipse.scout.rt.dataobject.id;

import static org.eclipse.scout.rt.platform.util.Assertions.assertNotNull;
import static org.eclipse.scout.rt.platform.util.CollectionUtility.arrayList;
import static org.eclipse.scout.rt.platform.util.ObjectUtility.isOneOf;

import java.util.Arrays;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.eclipse.scout.rt.platform.ApplicationScoped;
import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.platform.util.LazyValue;
import org.eclipse.scout.rt.platform.util.StringUtility;

import jakarta.annotation.PostConstruct;

/**
 * Codec used to convert between {@link IId} instances and their qualified/unqualified representation as {@link String}.
 */
@ApplicationScoped
public class IdCodec {

  protected final LazyValue<IdFactory> m_idFactory = new LazyValue<>(IdFactory.class);
  protected final LazyValue<IdInventory> m_idInventory = new LazyValue<>(IdInventory.class);

  protected final Map<Class<?>, Function<String, Object>> m_rawTypeFromStringMapper = new HashMap<>();
  protected final Map<Class<?>, Function<Object, String>> m_rawTypeToStringMapper = new HashMap<>();

  public interface IIdCodecFlag {
  }

  public enum IdCodecFlag implements IIdCodecFlag {
    LENIENT,
    ENCRYPTION
  }

  @PostConstruct
  protected void initialize() {
    // setup default type mappings between raw type <--> string
    registerRawTypeMapper(String.class, s -> s, Object::toString);
    registerRawTypeMapper(UUID.class, UUID::fromString, Object::toString);
    registerRawTypeMapper(Long.class, Long::parseLong, Object::toString);
    registerRawTypeMapper(Integer.class, Integer::parseInt, Object::toString);
    registerRawTypeMapper(Date.class, d -> new Date(Long.parseLong(d)), d -> String.valueOf(d.getTime()));
    registerRawTypeMapper(Locale.class, Locale::forLanguageTag, Locale::toLanguageTag);
  }

  // ---------------- IId to String ----------------

  /**
   * @see #toQualified(IId, Collection)
   */
  public String toQualified(IId id, IIdCodecFlag... flags) {
    return toQualified(id, arrayList(flags));
  }

  /**
   * Returns a string in the format <code>"[type-name]:[raw-id;raw-id;...]"</code>.
   * <ul>
   * <li><b>type-name</b> is computed by {@link IdInventory#getTypeName(IId)}.
   * <li><b>raw-id's</b> are the wrapped ids converted to their string representation (see
   * {@link #registerRawTypeMapper(Class, Function, Function)}), composite ids are unwrapped to their root ids and then
   * converted to their string representation, separated by ';'.
   * </ul>
   */
  public String toQualified(IId id, Collection<IIdCodecFlag> flags) {
    if (id == null) {
      return null;
    }
    String typeName = m_idInventory.get().getTypeName(id);
    if (StringUtility.isNullOrEmpty(typeName)) {
      throw new PlatformException("Missing @{} in class {}", IdTypeName.class.getSimpleName(), id.getClass());
    }
    return typeName + ":" + toUnqualified(id, flags);
  }

  /**
   * @see #toUnqualified(IId, Collection)
   */
  public String toUnqualified(IId id, IIdCodecFlag... flags) {
    return toUnqualified(id, arrayList(flags));
  }

  /**
   * Returns a string in the format <code>"[raw-id;raw-id;...]"</code>.
   * <ul>
   * <li><b>raw-id's</b> are the wrapped ids converted to their string representation (see
   * {@link #registerRawTypeMapper(Class, Function, Function)}), composite ids are unwrapped to their root ids and then
   * converted to their string representation, separated by ';'.
   * </ul>
   */
  public String toUnqualified(IId id, Collection<IIdCodecFlag> flags) {
    if (id == null) {
      return null;
    }
    if (id instanceof IRootId) {
      Object value = id.unwrap();
      Function<Object, String> mapper = m_rawTypeToStringMapper.get(value.getClass());
      if (mapper == null) {
        throw new PlatformException("Missing raw type mapper for wrapped type {}, id type {}", value.getClass(), id.getClass());
      }
      return mapper.apply(value);
    }
    else if (id instanceof ICompositeId) {
      List<? extends IId> components = ((ICompositeId) id).unwrap();
      return components.stream()
          .map(comp -> toUnqualified(comp, flags))
          .map(s -> s == null ? "" : s) // empty string if component is null just in case of composite id
          .collect(Collectors.joining(";"));
    }
    return handleToUnqualifiedUnknownIdType(id, flags);
  }

  // ---------------- String to IId ----------------

  /**
   * @see #fromQualified(String, Collection)
   */
  public IId fromQualified(String qualifiedId, IIdCodecFlag... flags) {
    return fromQualified(qualifiedId, arrayList(flags));
  }

  /**
   * Parses a string in the format {@code [type-name]:[raw-id;raw-id;...]}.
   *
   * @return {@code IId} parsed from {@code qualifiedId}
   * @throws PlatformException
   *           if the given string does not match the expected format or the referenced class is not found.
   */
  public IId fromQualified(String qualifiedId, Collection<IIdCodecFlag> flags) {
    return fromQualifiedInternal(qualifiedId, flags);
  }

  /**
   * @see #fromUnqualified(Class, String, Collection)
   */
  public <ID extends IId> ID fromUnqualified(Class<ID> idClass, String unqualifiedId, IIdCodecFlag... flags) {
    return fromUnqualified(idClass, unqualifiedId, arrayList(flags));
  }

  /**
   * Parses a string in the format {@code [raw-id;raw-id;...]}.
   *
   * @return {@code IId} parsed from {@code qualifiedId} or {@code null} if the given class or string is {@code null}
   * @throws PlatformException
   *           if the given string does not match the expected format
   */
  public <ID extends IId> ID fromUnqualified(Class<ID> idClass, String unqualifiedId, Collection<IIdCodecFlag> flags) {
    if (idClass == null) {
      throw new PlatformException("Missing id class to parse unqualified id {}", unqualifiedId);
    }
    if (StringUtility.isNullOrEmpty(unqualifiedId)) {
      return null;
    }
    return fromUnqualifiedUnchecked(idClass, unqualifiedId, flags);
  }

  /**
   * Register type mapping between a string representation and the corresponding raw type.
   * <p>
   * Note: The access to the type mapping data structure is not synchronized and therefore not thread safe. Use this
   * method to set up the {@link IdCodec} instance directly after platform start and not to change the {@link IdCodec}
   * behavior dynamically at runtime.
   */
  public <T> void registerRawTypeMapper(Class<T> rawType, Function<String, Object> fromStringMapper, Function<T, String> toStringMapper) {
    assertNotNull(rawType, "cannot register type mapper for null type");
    assertNotNull(fromStringMapper, "cannot register null type mapper from string");
    assertNotNull(toStringMapper, "cannot register null type mapper to string");

    //noinspection unchecked
    m_rawTypeToStringMapper.put(rawType, (Function<Object, String>) toStringMapper);
    m_rawTypeFromStringMapper.put(rawType, fromStringMapper);
  }

  /**
   * Unregister type mapping between a string representation and the given {@code rawType}.
   * <p>
   * Note: The access to the type mapping data structure is not synchronized and therefore not thread safe. Use this
   * method to set up the {@link IdCodec} instance directly after platform start and not to change the {@link IdCodec}
   * behavior dynamically at runtime.
   */
  public void unregisterRawTypeMapper(Class<?> rawType) {
    m_rawTypeToStringMapper.remove(rawType);
    m_rawTypeFromStringMapper.remove(rawType);
  }

  // ---------------- helper methods ----------------

  /**
   * Callback method to implement if the codec should be extended to handle qualification of unknown {@link IId} types.
   */
  protected String handleToUnqualifiedUnknownIdType(IId id, Collection<IIdCodecFlag> flags) {
    throw new PlatformException("Unsupported id type {}, cannot convert id {}", id.getClass(), id);
  }

  /**
   * Parses a string in the format {@code [type-name]:[raw-id;raw-id;...]}.
   *
   * @param flags
   *          If the structure of the given {@code qualifiedId} is invalid and {@code IdCodecFlag.LENIENT} flag is set,
   *          value {@code null} is returned. If {@code IdCodecFlag.LENIENT} flag is not set, an exception is thrown.
   * @return {@code IId} parsed from {@code qualifiedId}
   */
  protected IId fromQualifiedInternal(String qualifiedId, Collection<IIdCodecFlag> flags) {
    if (StringUtility.isNullOrEmpty(qualifiedId)) {
      return null;
    }
    boolean lenient = isOneOf(IdCodecFlag.LENIENT, flags);
    String[] tmp = qualifiedId.split(":", 2); // split into at most two parts
    if (tmp.length < 2) { // no ":" found
      if (lenient) {
        return null;
      }
      else {
        throw new PlatformException("Qualified id '{}' format is invalid", qualifiedId);
      }
    }
    String typeName = tmp[0];
    Class<? extends IId> idClass = m_idInventory.get().getIdClass(typeName);
    if (idClass == null) {
      if (lenient) {
        return null;
      }
      else {
        throw new PlatformException("No class found for type name '{}'", typeName);
      }
    }
    return fromUnqualified(idClass, tmp[1], flags);
  }

  /**
   * Parses a string in the format {@code [raw-id;raw-id;...]} assuming inputs were checked for null/empty values
   * before.
   *
   * @return {@code IId} parsed from {@code qualifiedId} or {@code null} if the given class or string is {@code null}
   * @throws PlatformException
   *           if the given string does not match the expected format
   */
  protected <ID extends IId> ID fromUnqualifiedUnchecked(Class<ID> idClass, String unqualifiedId, Collection<IIdCodecFlag> flags) {
    String[] rawComponents = unqualifiedId.split(";", -1 /* force empty strings for empty components */);
    Object[] components = parseComponents(idClass, rawComponents, flags);
    return m_idFactory.get().createInternal(idClass, components);
  }

  /**
   * Parses given {@code rawComponents} based on the declared component types of given {@code idClass}.
   */
  protected Object[] parseComponents(Class<? extends IId> idClass, String[] rawComponents, Collection<IIdCodecFlag> flags) {
    List<Class<?>> componentTypes = m_idFactory.get().getRawTypes(idClass);
    if (!(componentTypes.size() == rawComponents.length)) {
      throw new PlatformException("Wrong argument size, expected {} parameter, got {} raw components {}, idType={}", componentTypes.size(), rawComponents.length, Arrays.toString(rawComponents), idClass.getName());
    }

    Object[] components = new Object[rawComponents.length];
    for (int i = 0; i < rawComponents.length; i++) {
      Class<?> type = componentTypes.get(i);
      Function<String, ?> mapper = m_rawTypeFromStringMapper.get(type);
      if (mapper == null) {
        throw new PlatformException("Missing raw type mapper for wrapped type {}, id type {}", type, idClass);
      }
      try {
        String raw = rawComponents[i];
        if (StringUtility.isNullOrEmpty(raw)) {
          components[i] = null;
        }
        else {
          components[i] = mapper.apply(raw);
        }
      }
      catch (Exception e) {
        throw new PlatformException("Failed to parse component value={}, rawType={}, idType={}", rawComponents[i], type.getName(), idClass.getName(), e);
      }
    }
    return components;
  }
}
