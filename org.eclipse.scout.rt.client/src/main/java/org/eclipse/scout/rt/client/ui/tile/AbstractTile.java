package org.eclipse.scout.rt.client.ui.tile;

import java.util.List;

import org.eclipse.scout.rt.client.ui.AbstractWidget;
import org.eclipse.scout.rt.client.ui.form.fields.GridData;
import org.eclipse.scout.rt.client.ui.tile.TileChains.TileDisposeTileChain;
import org.eclipse.scout.rt.client.ui.tile.TileChains.TileInitTileChain;
import org.eclipse.scout.rt.platform.IOrdered;
import org.eclipse.scout.rt.platform.Order;
import org.eclipse.scout.rt.platform.annotations.ConfigProperty;
import org.eclipse.scout.rt.platform.exception.PlatformException;
import org.eclipse.scout.rt.shared.data.tile.ITileColorScheme;
import org.eclipse.scout.rt.shared.data.tile.TileColorScheme;
import org.eclipse.scout.rt.shared.extension.AbstractExtension;
import org.eclipse.scout.rt.shared.extension.IExtension;
import org.eclipse.scout.rt.shared.extension.ObjectExtensions;

/**
 * @since 7.1
 */
public abstract class AbstractTile extends AbstractWidget implements ITile {

  private final ObjectExtensions<AbstractTile, ITileExtension<? extends AbstractTile>> m_objectExtensions;

  public AbstractTile() {
    this(true);
  }

  public AbstractTile(boolean callInitializer) {
    super(false);
    m_objectExtensions = new ObjectExtensions<>(this, false);
    if (callInitializer) {
      callInitializer();
    }
  }

  @Override
  protected void callInitializer() {
    interceptInitConfig();
  }

  protected final void interceptInitConfig() {
    m_objectExtensions.initConfigAndBackupExtensionContext(createLocalExtension(), this::initConfig);
  }

  @Override
  protected void initConfig() {
    super.initConfig();
    setOrder(calculateViewOrder());
    setColorScheme(getConfiguredColorScheme());
    setCssClass(getConfiguredCssClass());
    // FIXME CGU tiles maybe better create getConfiguredGridDataHints and enhance GridData with "with" pattern
    setGridDataHints(new GridData(getConfiguredGridX(), getConfiguredGridY(), getConfiguredGridW(), getConfiguredGridH(), getConfiguredGridWeightX(), getConfiguredGridWeightY(), false, false, -1, -1, true, true, 0, 0));
  }

  @Override
  public void postInitConfig() {
    // NOP
  }

  @Override
  public final void init() {
    try {
      initInternal();
      interceptInitTile();
    }
    catch (Exception e) {
      handleInitException(e);
    }
  }

  protected void initInternal() {
    // nop
  }

  protected void handleInitException(Exception exception) {
    throw new PlatformException("Exception occured while initializing tile", exception);
  }

  protected void execInitTile() {
    // NOP
  }

  @Override
  public final void dispose() {
    disposeInternal();
    interceptDisposeTile();
  }

  protected void disposeInternal() {
    // NOP
  }

  protected void execDisposeTile() {
    // NOP
  }

  /**
   * Calculates the tiles's view order, e.g. if the @Order annotation is set to 30.0, the method will return 30.0. If no
   * {@link Order} annotation is set, the method checks its super classes for an @Order annotation.
   *
   * @since 3.10.0-M4
   */
  @SuppressWarnings("squid:S1244")
  protected double calculateViewOrder() {
    double viewOrder = getConfiguredViewOrder();
    Class<?> cls = getClass();
    if (viewOrder == IOrdered.DEFAULT_ORDER) {
      while (cls != null && ITile.class.isAssignableFrom(cls)) {
        if (cls.isAnnotationPresent(Order.class)) {
          Order order = (Order) cls.getAnnotation(Order.class);
          return order.value();
        }
        cls = cls.getSuperclass();
      }
    }
    return viewOrder;
  }

  /**
   * Configures the view order of this tile. The view order determines the order in which the tiles appear in the tile
   * box. The order of tiles with no view order configured ({@code < 0}) is initialized based on the {@link Order}
   * annotation of the tile class.
   * <p>
   * Subclasses can override this method. The default is {@link IOrdered#DEFAULT_ORDER}.
   *
   * @return View order of this tile.
   */
  @ConfigProperty(ConfigProperty.DOUBLE)
  @Order(80)
  protected double getConfiguredViewOrder() {
    return IOrdered.DEFAULT_ORDER;
  }

  @ConfigProperty(ConfigProperty.BOOLEAN)
  @Order(10)
  protected ITileColorScheme getConfiguredColorScheme() {
    return TileColorScheme.DEFAULT;
  }

  /**
   * Configures the css class(es) of this tile.
   * <p>
   * Subclasses can override this method. Default is {@code null}.
   *
   * @return a string containing one or more classes separated by space, or null if no class should be set.
   */
  @ConfigProperty(ConfigProperty.STRING)
  @Order(55)
  protected String getConfiguredCssClass() {
    return null;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(20)
  protected int getConfiguredGridW() {
    return 1;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(30)
  protected int getConfiguredGridH() {
    return 1;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(40)
  protected int getConfiguredGridX() {
    return -1;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(50)
  protected int getConfiguredGridY() {
    return -1;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(60)
  protected int getConfiguredGridWeightX() {
    return -1;
  }

  @ConfigProperty(ConfigProperty.INTEGER)
  @Order(70)
  protected int getConfiguredGridWeightY() {
    return 0;
  }

  @Override
  public double getOrder() {
    return propertySupport.getPropertyDouble(PROP_ORDER);
  }

  @Override
  public void setOrder(double order) {
    propertySupport.setPropertyDouble(PROP_ORDER, order);
  }

  @Override
  public GridData getGridDataHints() {
    return new GridData((GridData) propertySupport.getProperty(PROP_GRID_DATA_HINTS));
  }

  @Override
  public void setGridDataHints(GridData hints) {
    propertySupport.setProperty(PROP_GRID_DATA_HINTS, new GridData(hints));
  }

  @Override
  public ITileColorScheme getColorScheme() {
    return (ITileColorScheme) propertySupport.getProperty(PROP_COLOR_SCHEME);
  }

  @Override
  public void setColorScheme(ITileColorScheme colorScheme) {
    propertySupport.setProperty(PROP_COLOR_SCHEME, colorScheme);
  }

  @Override
  public String getCssClass() {
    return propertySupport.getPropertyString(PROP_CSS_CLASS);
  }

  @Override
  public void setCssClass(String cssClass) {
    propertySupport.setPropertyString(PROP_CSS_CLASS, cssClass);
  }

  @Override
  public final List<? extends ITileExtension<? extends AbstractTile>> getAllExtensions() {
    return m_objectExtensions.getAllExtensions();
  }

  @Override
  public <T extends IExtension<?>> T getExtension(Class<T> c) {
    return m_objectExtensions.getExtension(c);
  }

  protected final void interceptDisposeTile() {
    List<? extends ITileExtension<? extends AbstractTile>> extensions = getAllExtensions();
    TileDisposeTileChain chain = new TileDisposeTileChain(extensions);
    chain.execDisposeTile();
  }

  protected final void interceptInitTile() {
    List<? extends ITileExtension<? extends AbstractTile>> extensions = getAllExtensions();
    TileInitTileChain chain = new TileInitTileChain(extensions);
    chain.execInitTile();
  }

  protected ITileExtension<? extends AbstractTile> createLocalExtension() {
    return new LocalTileExtension<>(this);
  }

  /**
   * The extension delegating to the local methods. This Extension is always at the end of the chain and will not call
   * any further chain elements.
   */
  protected static class LocalTileExtension<OWNER extends AbstractTile> extends AbstractExtension<OWNER> implements ITileExtension<OWNER> {

    public LocalTileExtension(OWNER owner) {
      super(owner);
    }

    @Override
    public void execDisposeTile(TileDisposeTileChain chain) {
      getOwner().execDisposeTile();
    }

    @Override
    public void execInitTile(TileInitTileChain chain) {
      getOwner().execInitTile();
    }

  }
}
